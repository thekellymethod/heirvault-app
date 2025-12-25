import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodePassportForm } from "@/lib/ocr-form-decoder";
import { uploadDocument } from "@/lib/storage";
import { renderToStream } from "@react-pdf/renderer";
import { ClientReceiptPDF } from "@/pdfs/ClientReceiptPDF";
import { sendClientReceiptEmail, sendAttorneyNotificationEmail } from "@/lib/email";
import { AuditAction } from "@/lib/db";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Try to get or create test invite first
    let invite: Awaited<ReturnType<typeof getOrCreateTestInvite>> | Awaited<ReturnType<typeof lookupClientInvite>> | null = await getOrCreateTestInvite(token);

    // If not a test code, do normal lookup
    if (!invite) {
      invite = await lookupClientInvite(token);
    }

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 }
      );
    }

    // Get form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Scanned form file is required" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF or image file." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Decode the passport-style form
    let decodedData;
    try {
      decodedData = await decodePassportForm(file, buffer);
    } catch (ocrError: unknown) {
      const message = ocrError instanceof Error ? ocrError.message : "Unknown error";
      console.error("Error decoding form:", ocrError);
      return NextResponse.json(
        { error: `Failed to process form: ${message}` },
        { status: 400 }
      );
    }

    // Archive the scanned form
    let archivedDocument;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { storagePath } = await uploadDocument({
        fileBuffer: arrayBuffer,
        filename: file.name,
        contentType: file.type,
      });
      const filePath = storagePath;
      archivedDocument = await prisma.documents.create({
        data: {
          client_id: invite.clientId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: filePath,
          mime_type: file.type,
          uploaded_via: "update-form",
          extracted_data: decodedData,
          ocr_confidence: decodedData.confidence ? Math.round(decodedData.confidence * 100) : null,
          document_hash: "", // Will be calculated if needed
        },
      });
    } catch (archiveError) {
      console.error("Failed to archive form:", archiveError);
      // Continue even if archiving fails
    }

    // Update client information
    const updatedClient = await prisma.clients.update({
      where: { id: invite.clientId },
      data: {
        first_name: decodedData.firstName || invite.client.firstName || "",
        last_name: decodedData.lastName || invite.client.lastName || "",
        email: decodedData.email || invite.client.email || "",
        phone: decodedData.phone || invite.client.phone || null,
        date_of_birth: decodedData.dateOfBirth
          ? new Date(decodedData.dateOfBirth)
          : invite.client.dateOfBirth || null,
      },
    });

    // Update or create policy if policy information provided
    let updatedPolicy = null;
    if (decodedData.policyNumber || decodedData.insurerName) {
      // Find or create insurer
      let insurer = null;
      if (decodedData.insurerName) {
        insurer = await prisma.insurers.findFirst({
          where: {
            name: {
              equals: decodedData.insurerName,
              mode: "insensitive",
            },
          },
        });

        if (!insurer) {
          insurer = await prisma.insurers.create({
            data: {
              name: decodedData.insurerName,
            },
          });
        }
      }

      // Update existing policy or create new one
      if (insurer) {
        const existingPolicy = await prisma.policies.findFirst({
          where: {
            client_id: invite.clientId,
            insurer_id: insurer.id,
          },
        });

        if (existingPolicy) {
          updatedPolicy = await prisma.policies.update({
            where: { id: existingPolicy.id },
            data: {
              policy_number: decodedData.policyNumber || existingPolicy.policy_number || null,
              policy_type: decodedData.policyType || existingPolicy.policy_type || null,
            },
          });
        } else {
          updatedPolicy = await prisma.policies.create({
            data: {
              client_id: invite.clientId,
              insurer_id: insurer.id,
              policy_number: decodedData.policyNumber || null,
              policy_type: decodedData.policyType || null,
            },
          });
        }

        // Link document to policy
        if (archivedDocument && updatedPolicy) {
          await prisma.documents.update({
            where: { id: archivedDocument.id },
            data: { policy_id: updatedPolicy.id },
          });
        }
      }
    }

    // Get organization and attorney info
    const access = await prisma.attorney_client_access.findFirst({
      where: {
        client_id: invite.clientId,
        is_active: true,
      },
      include: {
        users: {
          include: {
            org_members: {
              include: {
                organizations: true,
              },
            },
          },
        },
      },
    });

    const organization = access?.users?.org_members?.[0]?.organizations;
    const attorney = access?.users;

    // Get updated policies for receipt
    const updatedPolicies = await prisma.policies.findMany({
      where: { client_id: invite.clientId },
      include: { insurers: true },
    });

    // Generate new receipt data
    const receiptId = `REC-${invite.clientId}-${Date.now()}`;
    const receiptData = {
      receiptId,
      client: {
        firstName: updatedClient.firstName,
        lastName: updatedClient.lastName,
        email: updatedClient.email,
        phone: updatedClient.phone,
        dateOfBirth: updatedClient.dateOfBirth,
      },
      policies: updatedPolicies.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        policyType: p.policyType,
        insurer: {
          name: p.insurer.name,
          contactPhone: p.insurer.contactPhone,
          contactEmail: p.insurer.contactEmail,
        },
      })),
      organization: organization
        ? {
            name: organization.name,
            addressLine1: organization.addressLine1,
            addressLine2: organization.addressLine2,
            city: organization.city,
            state: organization.state,
            postalCode: organization.postalCode,
            phone: organization.phone,
          }
        : null,
      registeredAt: updatedClient.createdAt,
      receiptGeneratedAt: new Date(),
    };

    // Generate receipt PDF
    let receiptPdfBuffer: Buffer | null = null;
    try {
      const pdfStream = await renderToStream(
        ClientReceiptPDF({
          receiptData: {
            receiptId,
            client: {
              firstName: receiptData.client.firstName,
              lastName: receiptData.client.lastName,
              email: receiptData.client.email,
              phone: receiptData.client.phone,
              dateOfBirth: receiptData.client.dateOfBirth ? new Date(receiptData.client.dateOfBirth) : null,
            },
            policies: receiptData.policies,
            organization: receiptData.organization,
            registeredAt: receiptData.registeredAt,
            receiptGeneratedAt: receiptData.receiptGeneratedAt,
          },
        })
      );

      const chunks: Uint8Array[] = [];
      const reader = pdfStream.getReader();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          chunks.push(value);
        }
      }

      receiptPdfBuffer = Buffer.concat(chunks);
    } catch (pdfError) {
      console.error("Error generating receipt PDF:", pdfError);
    }

    // Send emails asynchronously
    const emailPromises: Promise<void>[] = [];

    // Send receipt email to client
    if (receiptPdfBuffer) {
      emailPromises.push(
        sendClientReceiptEmail({
          to: receiptData.client.email,
          clientName: `${receiptData.client.firstName} ${receiptData.client.lastName}`,
          receiptId,
          receiptPdf: receiptPdfBuffer,
          firmName: organization?.name,
        }).then(() => undefined).catch((emailError) => {
          console.error("Error sending client receipt email:", emailError);
        })
      );
    }

    // Send notification email to attorney
    if (attorney && organization) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
      const updateUrl = `${baseUrl}/qr-update/${token}`;
      const attorneyEmail = attorney.email || organization.phone;
      
      if (attorneyEmail && attorneyEmail.includes("@")) {
        emailPromises.push(
          sendAttorneyNotificationEmail({
            to: attorneyEmail,
            attorneyName: attorney.firstName || "Attorney",
            clientName: `${receiptData.client.firstName} ${receiptData.client.lastName}`,
            receiptId,
            policiesCount: receiptData.policies.length,
            updateUrl,
          }).then(() => undefined).catch((emailError) => {
            console.error("Error sending attorney notification email:", emailError);
          })
        );
      }
    }

    // Don't wait for emails
    Promise.all(emailPromises).catch((error) => {
      console.error("Error sending emails:", error);
    });

    // Log audit event
    const auditLogId = randomUUID();
    await prisma.audit_logs.create({
      data: {
        id: auditLogId,
        action: AuditAction.CLIENT_UPDATED,
        message: `Client information updated via scanned form: ${file.name}`,
        client_id: invite.clientId,
        policy_id: updatedPolicy?.id || null,
        user_id: null,
        org_id: null,
        created_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      receiptId,
      message: "Form processed successfully. Updated receipt has been sent to your email.",
      decodedData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error processing update form:", error);
    return NextResponse.json(
      { error: message },
      { 
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

