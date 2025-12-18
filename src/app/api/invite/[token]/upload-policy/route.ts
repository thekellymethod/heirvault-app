import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { AuditAction } from "@prisma/client";
import { ClientReceiptPDF } from "@/pdfs/ClientReceiptPDF";
import { sendClientReceiptEmail, sendAttorneyNotificationEmail } from "@/lib/email";
import { extractPolicyData } from "@/lib/ocr";
import { storeFile } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { getOrCreateTestInvite } from "@/lib/test-invites";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    // This endpoint is public - clients submit via invite token without authentication

    // Try to get or create test invite first
    let invite = await getOrCreateTestInvite(token);

    // If not a test code, do normal lookup
    if (!invite) {
      invite = await prisma.clientInvite.findUnique({
        where: { token },
        include: { client: true },
      });
    }

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 }
      );
    }

    const now = new Date();
    // Allow updates even after invite is used, but check expiration (with 30 day grace period)
    const daysSinceExpiration = (now.getTime() - invite.expiresAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceExpiration > 30) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Get form data - can be FormData or JSON
    let file: File | null = null;
    let policyData: string | null = null;
    let changeRequest: string | null = null;
    let clientData: string | null = null;

    const contentType = req.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      // JSON request (from passport form digital submission)
      const body = await req.json();
      clientData = JSON.stringify(body.clientData || {});
      policyData = JSON.stringify(body.policyData || {});
      // No file in JSON requests
      file = null;
    } else {
      // FormData request (file upload or scanned form)
      const formData = await req.formData();
      file = formData.get("file") as File | null;
      policyData = formData.get("policyData") as string | null;
      changeRequest = formData.get("changeRequest") as string | null;
      clientData = formData.get("clientData") as string | null;
    }

    // Check if this is a change request (client already has a policy)
    const isChangeRequest = !!changeRequest;
    
    if (!file && !policyData && !isChangeRequest) {
      return NextResponse.json(
        { error: "Policy file or data is required" },
        { status: 400 }
      );
    }

    let extractedData: any = null;
    let archivedDocument: any = null;

    // If file is provided, extract data using OCR and archive
    if (file) {
      // Validate file type
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Please upload a PDF or image file." },
          { status: 400 }
        );
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File size must be less than 10MB" },
          { status: 400 }
        );
      }

      try {
        // Convert file to buffer for OCR processing
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract data using OCR
        const ocrResult = await extractPolicyData(file, buffer);
        extractedData = {
          firstName: ocrResult.firstName,
          lastName: ocrResult.lastName,
          email: ocrResult.email,
          phone: ocrResult.phone,
          dateOfBirth: ocrResult.dateOfBirth,
          policyNumber: ocrResult.policyNumber,
          policyType: ocrResult.policyType,
          insurerName: ocrResult.insurerName,
          insurerPhone: ocrResult.insurerPhone,
          insurerEmail: ocrResult.insurerEmail,
        };

        // Archive the original file
        const { filePath } = await storeFile(file, invite.clientId);
        
        // Store document record in database
        archivedDocument = await prisma.document.create({
          data: {
            clientId: invite.clientId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            filePath: filePath,
            mimeType: file.type,
            uploadedVia: "invite",
            extractedData: extractedData,
            ocrConfidence: ocrResult.confidence,
          },
        });

        // Log document upload (public route - no user context)
        await prisma.auditLog.create({
          data: {
            action: AuditAction.DOCUMENT_UPLOADED,
            message: `Policy document uploaded and processed via OCR: ${file.name}`,
            clientId: invite.clientId,
            userId: null,
            orgId: null,
            policyId: null,
          },
        });

        console.log("OCR extraction completed:", {
          fileName: file.name,
          confidence: ocrResult.confidence,
          extractedFields: Object.keys(extractedData).filter((k) => extractedData[k] !== null),
        });
      } catch (ocrError: any) {
        console.error("OCR extraction error:", ocrError);
        
        // Archive file even if OCR fails
        try {
          const { filePath } = await storeFile(file, invite.clientId);
          archivedDocument = await prisma.document.create({
            data: {
              clientId: invite.clientId,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              filePath: filePath,
              mimeType: file.type,
              uploadedVia: "invite",
              extractedData: null,
              ocrConfidence: 0,
            },
          });
        } catch (archiveError) {
          console.error("Failed to archive file:", archiveError);
        }

        // Don't fail the request if OCR fails - allow manual entry
        // extractedData remains null, user can enter manually
      }
    }

    // Parse policy data if provided
    let policyInfo: any = null;
    if (policyData) {
      try {
        policyInfo = JSON.parse(policyData);
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    // Merge extracted data with provided data
    const finalPolicyData = {
      ...extractedData,
      ...policyInfo,
    };

    // Find or create insurer
    let insurer = null;
    if (finalPolicyData?.insurerName) {
      insurer = await prisma.insurer.findFirst({
        where: {
          name: {
            equals: finalPolicyData.insurerName,
            mode: "insensitive",
          },
        },
      });

      if (!insurer) {
        insurer = await prisma.insurer.create({
          data: {
            name: finalPolicyData.insurerName,
            contactPhone: finalPolicyData.insurerPhone || null,
            contactEmail: finalPolicyData.insurerEmail || null,
            website: finalPolicyData.insurerWebsite || null,
          },
        });
      }
    }

    // Create policy if we have insurer info (only if not a change request)
    let policy = null;
    if (insurer && !isChangeRequest) {
      // Check if policy already exists
      const existingPolicy = await prisma.policy.findFirst({
        where: {
          clientId: invite.clientId,
          insurerId: insurer.id,
          policyNumber: finalPolicyData?.policyNumber || undefined,
        },
      });

      if (existingPolicy) {
        policy = existingPolicy;
      } else {
        policy = await prisma.policy.create({
          data: {
            clientId: invite.clientId,
            insurerId: insurer.id,
            policyNumber: finalPolicyData?.policyNumber || null,
            policyType: finalPolicyData?.policyType || null,
          },
        });

        // Update document with policy ID if available
        if (archivedDocument) {
          await prisma.document.update({
            where: { id: archivedDocument.id },
            data: { policyId: policy.id },
          });
        }
      }
    }

    // Update document record with policy ID if policy was created
    if (archivedDocument && policy) {
      await prisma.document.update({
        where: { id: archivedDocument.id },
        data: { policyId: policy.id },
      });
    }

    // Log document processing completion (public route - no user context)
    if (archivedDocument) {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.DOCUMENT_PROCESSED,
          message: `Document processed: ${archivedDocument.fileName}${extractedData ? " (OCR successful)" : " (manual entry required)"}`,
          clientId: invite.clientId,
          policyId: policy?.id || null,
          userId: null,
          orgId: null,
        },
      });
    }

    // If this is a change request, log it for attorney notification
    if (isChangeRequest && changeRequest) {
      // In production, send an email notification to the attorney
      // For now, we'll just log it
      console.log("Change request received:", {
        clientId: invite.clientId,
        changeRequest,
        hasFile: !!file,
        policyId: policy?.id,
      });
    }

    // Parse and update client info if provided
    let clientInfo: any = null;
    if (clientData) {
      try {
        clientInfo = JSON.parse(clientData);
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    // Update client info
    if (clientInfo || finalPolicyData?.firstName || finalPolicyData?.lastName) {
      await prisma.client.update({
        where: { id: invite.clientId },
        data: {
          firstName: clientInfo?.firstName || finalPolicyData?.firstName || invite.client.firstName,
          lastName: clientInfo?.lastName || finalPolicyData?.lastName || invite.client.lastName,
          email: clientInfo?.email || invite.client.email,
          phone: clientInfo?.phone || finalPolicyData?.phone || invite.client.phone || null,
          dateOfBirth: clientInfo?.dateOfBirth
            ? new Date(clientInfo.dateOfBirth)
            : finalPolicyData?.dateOfBirth
            ? new Date(finalPolicyData.dateOfBirth)
            : invite.client.dateOfBirth,
          ssnLast4: clientInfo?.ssnLast4 || null,
          maidenName: clientInfo?.maidenName || null,
          driversLicense: clientInfo?.driversLicense || null,
          passportNumber: clientInfo?.passportNumber || null,
        },
      });
    }

    // Mark invite as used (no authentication required for client submissions)
    // The invite can be used multiple times for updates, but we'll mark it as used after first submission
    if (!invite.usedAt && !isChangeRequest) {
      await prisma.clientInvite.update({
        where: { id: invite.id },
        data: { usedAt: now },
      });
    }

    // Generate receipt ID
    const receiptId = `REC-${invite.clientId}-${Date.now()}`;

    // Get organization and attorney info for emails
    const access = await prisma.attorneyClientAccess.findFirst({
      where: {
        clientId: invite.clientId,
        isActive: true,
      },
      include: {
        attorney: {
          include: {
            orgMemberships: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    const organization = access?.attorney?.orgMemberships?.[0]?.organization;
    const attorney = access?.attorney;

    // Get updated client with policies for receipt
    const updatedClient = await prisma.client.findUnique({
      where: { id: invite.clientId },
      include: {
        policies: {
          include: {
            insurer: true,
          },
        },
      },
    });

    // Generate receipt data
    const receiptData = {
      receiptId,
      client: {
        firstName: updatedClient?.firstName || invite.client.firstName,
        lastName: updatedClient?.lastName || invite.client.lastName,
        email: updatedClient?.email || invite.client.email,
        phone: updatedClient?.phone || invite.client.phone,
        dateOfBirth: updatedClient?.dateOfBirth || invite.client.dateOfBirth,
      },
      policies: updatedClient?.policies.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        policyType: p.policyType,
        insurer: {
          name: p.insurer.name,
          contactPhone: p.insurer.contactPhone,
          contactEmail: p.insurer.contactEmail,
        },
      })) || [],
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
      registeredAt: updatedClient?.createdAt || invite.client.createdAt,
      receiptGeneratedAt: new Date(),
    };

    // Generate receipt PDF
    let receiptPdfBuffer: Buffer | null = null;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
      const updateUrl = `${baseUrl}/invite/${token}/update`;
      
      const pdfStream = await renderToStream(
        ClientReceiptPDF({ 
          receiptData: {
            ...receiptData,
            updateUrl,
          }
        })
      );

      // Convert stream to buffer
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
      // Continue without PDF - emails will still be sent
    }

    // Send emails asynchronously (don't block response)
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
        }).catch((emailError) => {
          console.error("Error sending client receipt email:", emailError);
        })
      );
    }

    // Send notification email to attorney
    if (attorney && organization) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
      const updateUrl = `${baseUrl}/invite/${token}/update`;
      const attorneyEmail = attorney.email || organization.phone; // Use organization contact if attorney email not available
      
      if (attorneyEmail && attorneyEmail.includes("@")) {
        emailPromises.push(
          sendAttorneyNotificationEmail({
            to: attorneyEmail,
            attorneyName: attorney.firstName || "Attorney",
            clientName: `${receiptData.client.firstName} ${receiptData.client.lastName}`,
            receiptId,
            policiesCount: receiptData.policies.length,
            updateUrl,
          }).catch((emailError) => {
            console.error("Error sending attorney notification email:", emailError);
          })
        );
      }
    }

    // Don't wait for emails to complete - return success immediately
    Promise.all(emailPromises).catch((error) => {
      console.error("Error sending emails:", error);
    });

    return NextResponse.json({
      success: true,
      receiptId,
      clientId: invite.clientId,
      policyId: policy?.id || null,
      message: "Policy uploaded successfully",
    });
  } catch (error: any) {
    console.error("Error uploading policy:", error);
    // Always return JSON, never HTML
    const errorMessage = error?.message || "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { 
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
