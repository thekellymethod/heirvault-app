import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { AuditAction } from "@/lib/db/enums";
import { ClientReceiptPDF } from "@/pdfs/ClientReceiptPDF";
import { sendClientReceiptEmail, sendAttorneyNotificationEmail } from "@/lib/email";
import { extractPolicyData } from "@/lib/ocr";
import { uploadDocument } from "@/lib/storage";
import { prisma as dbPrisma } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { randomUUID } from "crypto";
import { lookupClientInvite } from "@/lib/invite-lookup";
import { generateDocumentHash } from "@/lib/document-hash";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    // This endpoint is public - clients submit via invite token without authentication

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

    let extractedData: {
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string | null;
      dateOfBirth: string | null;
      policyNumber: string | null;
      policyType: string | null;
      insurerName: string | null;
      insurerPhone: string | null;
      insurerEmail: string | null;
    } | null = null;
    let archivedDocument: { id: string; [key: string]: unknown } | null = null;

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
        
        // Generate document hash for duplicate detection
        const documentHash = generateDocumentHash(buffer);

        // Check for existing document with same hash for THIS client only
        // This prevents cross-client document reuse while allowing same-client deduplication
        const existingDocResult = await prisma.$queryRawUnsafe<Array<{
          id: string;
          client_id: string;
          policy_id: string | null;
        }>>(`
          SELECT id, client_id, policy_id
          FROM documents
          WHERE document_hash = $1 AND client_id = $2
          LIMIT 1
        `, documentHash, invite.clientId);

        if (existingDocResult && existingDocResult.length > 0) {
          // Document with same hash exists for this client - reuse it
          archivedDocument = {
            id: existingDocResult[0].id,
            clientId: existingDocResult[0].client_id,
            policyId: existingDocResult[0].policy_id,
          };
          console.log(`Reusing existing document ${archivedDocument.id} for client ${invite.clientId} (hash match)`);
        } else {
          // Check if hash exists for a DIFFERENT client (security warning)
          const otherClientDocResult = await prisma.$queryRawUnsafe<Array<{
            id: string;
            client_id: string;
          }>>(`
            SELECT id, client_id
            FROM documents
            WHERE document_hash = $1 AND client_id != $2
            LIMIT 1
          `, documentHash, invite.clientId);

          if (otherClientDocResult && otherClientDocResult.length > 0) {
            // Hash collision with different client - log warning but create new document
            console.warn(
              `Document hash collision detected: Hash ${documentHash.substring(0, 16)}... ` +
              `exists for client ${otherClientDocResult[0].client_id} but creating new document for client ${invite.clientId}`
            );
          }

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
          const fileArrayBuffer = await file.arrayBuffer();
          const { storagePath } = await uploadDocument({
            fileBuffer: fileArrayBuffer,
            filename: file.name,
            contentType: file.type,
          });
          const filePath = storagePath;
          
          // Store document record in database with hash
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
              documentHash: documentHash,
            },
          });
        }

        // Log document upload (public route - no user context)
        await prisma.audit_logs.create({
          data: {
            id: randomUUID(),
            action: AuditAction.DOCUMENT_UPLOADED,
            message: `Policy document uploaded and processed via OCR: ${file.name}`,
            client_id: invite.clientId,
            user_id: null,
            org_id: null,
            policy_id: null,
            created_at: new Date(),
          },
        });

        console.log("OCR extraction completed:", {
          fileName: file.name,
          confidence: ocrResult.confidence,
          extractedFields: Object.keys(extractedData).filter((k) => extractedData[k] !== null),
        });
      } catch (ocrError: unknown) {
        const errorMessage = ocrError instanceof Error ? ocrError.message : String(ocrError);
        console.error("OCR extraction error:", errorMessage);
        
        // Archive file even if OCR fails
        try {
          const fileArrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(fileArrayBuffer);
          const documentHash = generateDocumentHash(buffer);
          
          // Check for existing document with same hash for THIS client only
          const existingDocResult = await prisma.$queryRawUnsafe<Array<{
            id: string;
            client_id: string;
            policy_id: string | null;
          }>>(`
            SELECT id, client_id, policy_id
            FROM documents
            WHERE document_hash = $1 AND client_id = $2
            LIMIT 1
          `, documentHash, invite.clientId);

          if (existingDocResult && existingDocResult.length > 0) {
            // Reuse existing document for this client
            archivedDocument = {
              id: existingDocResult[0].id,
              clientId: existingDocResult[0].client_id,
              policyId: existingDocResult[0].policy_id,
            };
            console.log(`Reusing existing document ${archivedDocument.id} for client ${invite.clientId} (hash match, OCR failed)`);
          } else {
            const { storagePath } = await uploadDocument({
              fileBuffer: fileArrayBuffer,
              filename: file.name,
              contentType: file.type,
            });
            const filePath = storagePath;
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
                documentHash: documentHash,
              },
            });
          }
        } catch (archiveError) {
          console.error("Failed to archive file:", archiveError);
        }

        // Don't fail the request if OCR fails - allow manual entry
        // extractedData remains null, user can enter manually
      }
    }

    // Parse policy data if provided
    let policyInfo: Record<string, unknown> | null = null;
    if (policyData) {
      try {
        policyInfo = JSON.parse(policyData) as Record<string, unknown>;
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Merge extracted data with provided data
    const finalPolicyData = {
      ...extractedData,
      ...policyInfo,
    };

    // Try to find existing insurer (lazy insurers: don't auto-create)
    let insurer: { id: string } | null = null;
    let carrierNameRaw: string | null = null;
    
    if (finalPolicyData?.insurerName && typeof finalPolicyData.insurerName === "string") {
      try {
        const insurerResult = await dbPrisma.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM insurers WHERE LOWER(name) = LOWER($1) LIMIT 1`,
          finalPolicyData.insurerName
        );
        
        if (insurerResult && insurerResult.length > 0) {
          insurer = { id: insurerResult[0].id };
        } else {
          // Insurer not found - store raw name instead (lazy insurers)
          carrierNameRaw = finalPolicyData.insurerName;
        }
      } catch (sqlError: any) {
        console.error("Upload policy: Insurer lookup failed:", sqlError.message);
        // Store raw name as fallback
        carrierNameRaw = finalPolicyData.insurerName;
      }
    }

    // Create policy (only if not a change request) - use raw SQL first
    // Policy can be created with or without insurer_id
    let policy: { id: string } | null = null;
    if (finalPolicyData?.insurerName && !isChangeRequest) {
      try {
        // Check if policy already exists using raw SQL
        // Match by client_id, policy_number, and either insurer_id or carrier_name_raw
        const existingPolicyResult = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM policies 
          WHERE client_id = ${invite.clientId} 
            AND (policy_number = ${finalPolicyData?.policyNumber || null} OR (policy_number IS NULL AND ${finalPolicyData?.policyNumber || null} IS NULL))
            AND (
              (insurer_id IS NOT NULL AND insurer_id = ${insurer?.id || null})
              OR (insurer_id IS NULL AND carrier_name_raw = ${carrierNameRaw || null})
            )
          LIMIT 1
        `;
        
        if (existingPolicyResult && existingPolicyResult.length > 0) {
          policy = { id: existingPolicyResult[0].id };
        } else {
          // Create new policy using raw SQL
          const policyId = randomUUID();
          await prisma.$executeRaw`
            INSERT INTO policies (id, client_id, insurer_id, carrier_name_raw, policy_number, policy_type, created_at, updated_at)
            VALUES (${policyId}, ${invite.clientId}, ${insurer?.id || null}, ${carrierNameRaw}, ${finalPolicyData?.policyNumber || null}, ${finalPolicyData?.policyType || null}, NOW(), NOW())
          `;
          policy = { id: policyId };
        }
      } catch (sqlError: unknown) {
        const errorMessage = sqlError instanceof Error ? sqlError.message : String(sqlError);
        console.error("Upload policy: Raw SQL policy create failed:", errorMessage);
        // Fallback to Prisma (will likely fail due to model name issues)
      }
    }

    // Update document record with policy ID if policy was created - use raw SQL
    // Only update if the document doesn't already have a policy_id (prevents overwriting existing associations)
    if (archivedDocument && policy) {
      try {
        // Check if document already has a policy_id to prevent overwriting
        const docCheck = await prisma.$queryRawUnsafe<Array<{ policy_id: string | null }>>(`
          SELECT policy_id FROM documents WHERE id = $1 LIMIT 1
        `, archivedDocument.id);
        
        if (docCheck && docCheck.length > 0 && !docCheck[0].policy_id) {
          // Only update if policy_id is null (document not yet associated with a policy)
          await prisma.$executeRaw`
            UPDATE documents SET policy_id = ${policy.id}, updated_at = NOW() WHERE id = ${archivedDocument.id} AND policy_id IS NULL
          `;
        } else if (docCheck && docCheck.length > 0 && docCheck[0].policy_id && docCheck[0].policy_id !== policy.id) {
          // Document already associated with a different policy - log warning
          console.warn(
            `Document ${archivedDocument.id} already associated with policy ${docCheck[0].policy_id}, ` +
            `not updating to policy ${policy.id}`
          );
        }
      } catch (sqlError: any) {
        console.error("Upload policy: Raw SQL document update failed:", sqlError.message);
        // Continue - document update is not critical
      }
    }

    // Log document processing completion - use audit function
    if (archivedDocument) {
      try {
        const { audit } = await import("@/lib/audit");
        await audit(AuditAction.DOCUMENT_PROCESSED, {
          resourceType: "document",
          resourceId: archivedDocument.id,
          clientId: invite.clientId,
          policyId: policy?.id || null,
          details: {
            fileName: typeof archivedDocument.fileName === "string" ? archivedDocument.fileName : "unknown",
            ocrSuccessful: extractedData !== null,
          },
        });
      } catch (auditError: unknown) {
        const errorMessage = auditError instanceof Error ? auditError.message : String(auditError);
        console.error("Upload policy: Audit logging failed:", errorMessage);
        // Continue - audit is non-critical
      }
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
    let clientInfo: { id: string; email: string; firstName: string; lastName: string; [key: string]: unknown } | null = null;
    if (clientData) {
      try {
        clientInfo = JSON.parse(clientData);
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    // Update client info - use raw SQL first
    if (clientInfo || finalPolicyData?.firstName || finalPolicyData?.lastName) {
      try {
        const firstName = clientInfo?.firstName || finalPolicyData?.firstName || invite.client.firstName;
        const lastName = clientInfo?.lastName || finalPolicyData?.lastName || invite.client.lastName;
        const email = clientInfo?.email || invite.client.email;
        const phone = clientInfo?.phone || finalPolicyData?.phone || invite.client.phone || null;
        const dateOfBirth = clientInfo?.dateOfBirth
          ? new Date(clientInfo.dateOfBirth)
          : finalPolicyData?.dateOfBirth
          ? new Date(finalPolicyData.dateOfBirth)
          : invite.client.dateOfBirth;
        
        // Regenerate fingerprint when client data changes
        const { generateClientFingerprint } = await import("@/lib/client-fingerprint");
        const fingerprint = generateClientFingerprint({
          email,
          firstName,
          lastName,
          dateOfBirth,
          ssnLast4: clientInfo?.ssnLast4 || null,
          passportNumber: clientInfo?.passportNumber || null,
          driversLicense: clientInfo?.driversLicense || null,
        });
        
        await prisma.$executeRaw`
          UPDATE clients
          SET 
            first_name = ${firstName},
            last_name = ${lastName},
            email = ${email},
            phone = ${phone},
            date_of_birth = ${dateOfBirth},
            ssn_last_4 = ${clientInfo?.ssnLast4 || null},
            maiden_name = ${clientInfo?.maidenName || null},
            drivers_license = ${clientInfo?.driversLicense || null},
            passport_number = ${clientInfo?.passportNumber || null},
            client_fingerprint = ${fingerprint},
            updated_at = NOW()
          WHERE id = ${invite.clientId}
        `;
      } catch (sqlError: any) {
        console.error("Upload policy: Raw SQL client update failed:", sqlError.message);
        // Continue - client update is not critical for policy upload
      }
    }

    // Mark invite as used - use raw SQL
    if (!invite.usedAt && !isChangeRequest) {
      try {
        await prisma.$executeRaw`
          UPDATE client_invites SET used_at = ${now}, updated_at = NOW() WHERE id = ${invite.id}
        `;
      } catch (sqlError: any) {
        console.error("Upload policy: Raw SQL invite update failed:", sqlError.message);
        // Continue - marking invite as used is not critical
      }
    }

    // Generate receipt ID
    const receiptId = `REC-${invite.clientId}-${Date.now()}`;

    // Get organization and attorney info for emails - use raw SQL first
    let organization: { id: string; name: string; [key: string]: unknown } | null = null;
    let attorney: { id: string; email: string; [key: string]: unknown } | null = null;
    try {
      const accessResult = await prisma.$queryRaw<Array<{
        attorney_id: string;
        attorney_email: string;
        attorney_first_name: string | null;
        attorney_last_name: string | null;
        org_id: string;
        org_name: string;
        org_address_line1: string | null;
        org_address_line2: string | null;
        org_city: string | null;
        org_state: string | null;
        org_postal_code: string | null;
        org_phone: string | null;
      }>>`
        SELECT 
          aca.attorney_id,
          u.email as attorney_email,
          u.first_name as attorney_first_name,
          u.last_name as attorney_last_name,
          o.id as org_id,
          o.name as org_name,
          o.address_line1 as org_address_line1,
          o.address_line2 as org_address_line2,
          o.city as org_city,
          o.state as org_state,
          o.postal_code as org_postal_code,
          o.phone as org_phone
        FROM attorney_client_access aca
        INNER JOIN users u ON u.id = aca.attorney_id
        LEFT JOIN org_members om ON om.user_id = aca.attorney_id
        LEFT JOIN organizations o ON o.id = om.organization_id
        WHERE aca.client_id = ${invite.clientId} AND aca.is_active = true
        LIMIT 1
      `;
      
      if (accessResult && accessResult.length > 0) {
        const row = accessResult[0];
        attorney = {
          id: row.attorney_id,
          email: row.attorney_email,
          firstName: row.attorney_first_name,
          lastName: row.attorney_last_name,
        };
        organization = {
          id: row.org_id,
          name: row.org_name,
          addressLine1: row.org_address_line1,
          addressLine2: row.org_address_line2,
          city: row.org_city,
          state: row.org_state,
          postalCode: row.org_postal_code,
          phone: row.org_phone,
        };
      }
    } catch (sqlError: any) {
      console.error("Upload policy: Raw SQL access lookup failed:", sqlError.message);
      // Continue without org/attorney info - emails will be skipped
    }

    // Get updated client with policies for receipt - use raw SQL
    let updatedClient: { id: string; [key: string]: unknown } | null = null;
    try {
      const [clientResult, policiesResult] = await Promise.all([
        prisma.$queryRaw<Array<{
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          date_of_birth: Date | null;
          created_at: Date;
        }>>`
          SELECT id, first_name, last_name, email, phone, date_of_birth, created_at
          FROM clients
          WHERE id = ${invite.clientId}
        `,
        prisma.$queryRaw<Array<{
          id: string;
          policy_number: string | null;
          policy_type: string | null;
          insurer_name: string;
          insurer_contact_phone: string | null;
          insurer_contact_email: string | null;
        }>>`
          SELECT 
            p.id,
            p.policy_number,
            p.policy_type,
            p.carrier_name_raw,
            i.name as insurer_name,
            i.contact_phone as insurer_contact_phone,
            i.contact_email as insurer_contact_email
          FROM policies p
          LEFT JOIN insurers i ON i.id = p.insurer_id
          WHERE p.client_id = ${invite.clientId}
        `,
      ]);
      
      if (clientResult && clientResult.length > 0) {
        const clientRow = clientResult[0];
        updatedClient = {
          id: clientRow.id,
          firstName: clientRow.first_name,
          lastName: clientRow.last_name,
          email: clientRow.email,
          phone: clientRow.phone,
          dateOfBirth: clientRow.date_of_birth,
          createdAt: clientRow.created_at,
          policies: (policiesResult || []).map(p => ({
            id: p.id,
            policyNumber: p.policy_number,
            policyType: p.policy_type,
            carrierNameRaw: p.carrier_name_raw,
            insurer: p.insurer_name ? {
              name: p.insurer_name,
              contactPhone: p.insurer_contact_phone,
              contactEmail: p.insurer_contact_email,
            } : null,
          })),
        };
      }
    } catch (sqlError: unknown) {
      const errorMessage = sqlError instanceof Error ? sqlError.message : String(sqlError);
      console.error("Upload policy: Raw SQL client/policies lookup failed:", errorMessage);
      // Fallback to invite.client data
      updatedClient = null;
    }

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
      const updateUrl = `${baseUrl}/qr-update/${token}`;
      
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
      const updateUrl = `${baseUrl}/qr-update/${token}`;
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
      receiptData,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
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
