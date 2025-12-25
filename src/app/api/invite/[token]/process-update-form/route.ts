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

    if (!invite || typeof invite !== 'object' || !('clientId' in invite) || !('client' in invite)) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 }
      );
    }

    // Extract clientId:and client with type assertion after type guard
    const typedInvite = invite as { clientId: string, client: { firstName?: string, lastName?: string, email?: string, phone?: string | null; dateOfBirth?: Date | null } };
    const clientId = typedInvite.clientId;
    const inviteClient = typedInvite.client;

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
          id: randomUUID(),
          clientId: clientId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          filePath: filePath,
          mimeType: file.type,
          uploadedVia: "update-form",
          extractedData: decodedData as any,
          ocrConfidence: decodedData.confidence ? Math.round(decodedData.confidence * 100) : null,
          documentHash: "", // Will be calculated if needed
        },
      });
    } catch (archiveError) {
      console.error("Failed to archive form:", archiveError);
      // Continue even if archiving fails
    }

    // Update client information
    const updatedClient = await prisma.clients.update({
      where: { id: clientId },
      data: {
        firstName: decodedData.firstName || inviteClient.firstName || "",
        lastName: decodedData.lastName || inviteClient.lastName || "",
        email: decodedData.email || inviteClient.email || "",
        phone: decodedData.phone || inviteClient.phone || null,
        dateOfBirth: decodedData.dateOfBirth
          ? new Date(decodedData.dateOfBirth)
          : inviteClient.dateOfBirth || null,
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
              id: randomUUID(),
              name: decodedData.insurerName,
            },
          });
        }
      }

      // Update existing policy or create new one
      if (insurer) {
        const existingPolicy = await prisma.policies.findFirst({
          where: {
            clientId: clientId,
            insurerId: insurer.id,
          },
        });

        if (existingPolicy) {
          updatedPolicy = await prisma.policies.update({
            where: { id: existingPolicy.id },
            data: {
              policyNumber: decodedData.policyNumber || existingPolicy.policyNumber || null,
              policyType: decodedData.policyType || existingPolicy.policyType || null,
            },
          });
        } else {
          updatedPolicy = await prisma.policies.create({
            data: {
              id: randomUUID(),
              clientId: clientId,
              insurerId: insurer.id,
              policyNumber: decodedData.policyNumber || null,
              policyType: decodedData.policyType || null,
            },
          });
        }

        // Link document to policy
        if (archivedDocument && updatedPolicy) {
          await prisma.documents.update({
            where: { id: archivedDocument.id },
            data: { policyId: updatedPolicy.id },
          });
        }
      }
    }

    // Get organization and attorney info
    const access = await prisma.attorneyClientAccess.findFirst({
      where: {
        clientId: clientId,
        isActive: true,
      },
      include: {
        users: {
          include: {
            orgMemberships: {
              include: {
                organizations: true,
              },
            },
          },
        },
      },
    });

    const organization = access?.users?.orgMemberships?.[0]?.organizations;
    const attorney = access?.users;

    // Get updated policies for receipt
    const updatedPolicies = await prisma.policies.findMany({
      where: { clientId: clientId },
      include: { insurers: true },
    });

    // Generate new receipt data
    const receiptId = `REC-${clientId}-${Date.now()}`;
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
        insurer: p.insurers ? {
          name: p.insurers.name,
          contactPhone: p.insurers.contactPhone,
          contactEmail: p.insurers.contactEmail,
        } : {
          name: "Unknown",
          contactPhone: null,
          contactEmail: null,
        },
      })),
      organization: organization
        ? {
            name: organization.name,
            addressLine1: organization.addressLine1 ?? undefined,
            addressLine2: organization.addressLine2 ?? undefined,
            city: organization.city ?? undefined,
            state: organization.state ?? undefined,
            postalCode: organization.postalCode ?? undefined,
            phone: organization.phone ?? undefined,
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
      const maybeWeb = pdfStream as { getReader?: () => ReadableStreamDefaultReader<Uint8Array> };
      
      if (typeof maybeWeb?.getReader === "function") {
        const reader = maybeWeb.getReader();
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            chunks.push(value);
          }
        }
        receiptPdfBuffer = Buffer.concat(chunks);
      } else {
        const nodeStream = pdfStream as NodeJS.ReadableStream;
        receiptPdfBuffer = await new Promise<Buffer>((resolve, reject) => {
          const nodeChunks: Buffer[] = [];
          nodeStream.on("data", (c: Buffer) => nodeChunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          nodeStream.on("end", () => resolve(Buffer.concat(nodeChunks)));
          nodeStream.on("error", reject);
        });
      }
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
        clientId: clientId,
        policyId: updatedPolicy?.id || null,
        userId: null,
        orgId: null,
        createdAt: new Date(),
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

