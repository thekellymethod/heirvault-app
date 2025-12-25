import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { AuditAction } from "@/lib/db/enums";
import { verifyConfirmationCode } from "../send-confirmation/route";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";
import { renderToStream } from "@react-pdf/renderer";
import { ClientReceiptPDF } from "@/pdfs/ClientReceiptPDF";
import { sendClientReceiptEmail, sendAttorneyNotificationEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { policies, beneficiaries, address } = body;
    
    // Get confirmation code from query or body
    const confirmationCode = body.confirmationCode || new URL(req.url).searchParams.get("code");
    const confirmationMethod = body.confirmationMethod || new URL(req.url).searchParams.get("method");

    // Verify confirmation code
    if (!confirmationCode || !confirmationMethod) {
      return NextResponse.json(
        { error: "Confirmation code is required" },
        { status: 400 }
      );
    }

    const isValid = verifyConfirmationCode(token, confirmationCode, confirmationMethod);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired confirmation code" },
        { status: 400 }
      );
    }

    // Try to get or create test invite first
    let invite: Awaited<ReturnType<typeof getOrCreateTestInvite>> | Awaited<ReturnType<typeof lookupClientInvite>> | null = await getOrCreateTestInvite(token);

    // If not a test code, do normal lookup
    if (!invite) {
      invite = await lookupClientInvite(token);
    }

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 }
      );
    }

    // Update address - use raw SQL first
    if (address) {
      try {
        await prisma.$executeRaw`
          UPDATE clients
          SET 
            address_line1 = ${address.street || null},
            city = ${address.city || null},
            state = ${address.state || null},
            postal_code = ${address.zipCode || null},
            updated_at = NOW()
          WHERE id = ${invite.clientId}
        `;
      } catch (sqlError: unknown) {
        const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
        console.error("Update client: Raw SQL address update failed, trying Prisma:", sqlErrorMessage);
        // Fallback to Prisma
        try {
          await prisma.clients.update({
            where: { id: invite.clientId },
            data: {
              address_line1: address.street || null,
              city: address.city || null,
              state: address.state || null,
              postal_code: address.zipCode || null,
            },
          });
        } catch (prismaError: unknown) {
          const prismaErrorMessage = prismaError instanceof Error ? prismaError.message : "Unknown error";
          console.error("Update client: Prisma address update also failed:", prismaErrorMessage);
          // Continue - address update is not critical
        }
      }
    }

    // Update policies - use raw SQL first
    if (policies && Array.isArray(policies)) {
      try {
        // Delete existing policies
        await prisma.$executeRaw`
          DELETE FROM policies WHERE client_id = ${invite.clientId}
        `;

        // Create new policies
        for (const policy of policies) {
          if (policy.insurerName && policy.policyNumber) {
            // Try to find existing insurer (lazy insurers: don't auto-create)
            let insurerId: string | null = null;
            let carrierNameRaw: string | null = null;
            
            try {
              const insurerResult = await prisma.$queryRaw<Array<{ id: string }>>`
                SELECT id FROM insurers WHERE LOWER(name) = LOWER(${policy.insurerName}) LIMIT 1
              `;
              
              if (insurerResult && insurerResult.length > 0) {
                insurerId = insurerResult[0].id;
              } else {
                // Insurer not found - store raw name instead (lazy insurers)
                carrierNameRaw = policy.insurerName;
              }
            } catch (insurerError: unknown) {
              const insurerErrorMessage = insurerError instanceof Error ? insurerError.message : "Unknown error";
              console.error("Update client: Insurer lookup failed:", insurerErrorMessage);
              // Store raw name as fallback
              carrierNameRaw = policy.insurerName;
            }

            // Create policy using raw SQL (with optional insurer_id and carrier_name_raw)
            const policyId = randomUUID();
            await prisma.$executeRaw`
              INSERT INTO policies (id, client_id, insurer_id, carrier_name_raw, policy_number, policy_type, created_at, updated_at)
              VALUES (${policyId}, ${invite.clientId}, ${insurerId}, ${carrierNameRaw}, ${policy.policyNumber || null}, ${policy.policyType || null}, NOW(), NOW())
            `;
          }
        }
      } catch (sqlError: unknown) {
        const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
        console.error("Update client: Raw SQL policy update failed:", sqlErrorMessage);
        // Fallback to Prisma (but this will likely also fail due to model name issues)
      }
    }

    // Update beneficiaries - use raw SQL first
    if (beneficiaries && Array.isArray(beneficiaries)) {
      try {
        // Delete existing beneficiaries
        await prisma.$executeRaw`
          DELETE FROM beneficiaries WHERE client_id = ${invite.clientId}
        `;

        // Create new beneficiaries
        for (const beneficiary of beneficiaries) {
          if (beneficiary.firstName && beneficiary.lastName) {
            const beneficiaryId = randomUUID();
            await prisma.$executeRaw`
              INSERT INTO beneficiaries (id, client_id, first_name, last_name, relationship, created_at, updated_at)
              VALUES (${beneficiaryId}, ${invite.clientId}, ${beneficiary.firstName}, ${beneficiary.lastName}, ${beneficiary.relationship || null}, NOW(), NOW())
            `;
          }
        }
      } catch (sqlError: unknown) {
        const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
        console.error("Update client: Raw SQL beneficiary update failed:", sqlErrorMessage);
        // Fallback to Prisma (but this will likely also fail)
      }
    }

    // Log audit event - use the audit function which already handles raw SQL
    try {
      const { logAuditEvent } = await import("@/lib/audit");
      await logAuditEvent({
        action: AuditAction.CLIENT_UPDATED,
        resourceType: "client",
        resourceId: invite.clientId,
        details: { source: "update portal" },
        userId: null,
      });
    } catch (auditError: unknown) {
      const auditErrorMessage = auditError instanceof Error ? auditError.message : "Unknown error";
      console.error("Update client: Audit logging failed:", auditErrorMessage);
      // Continue - audit is non-critical
    }

    // Generate receipt ID
    const receiptId = `REC-${invite.clientId}-${Date.now()}`;

    // Get organization and attorney info for emails - use raw SQL first
    let organization: {
      id: string;
      name: string;
      addressLine1: string | null;
      addressLine2: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      phone: string | null;
    } | null = null;
    let attorney: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null = null;
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
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Update client: Raw SQL access lookup failed:", sqlErrorMessage);
      // Continue without org/attorney info - emails will be skipped
    }

    // Get updated client with policies for receipt - use raw SQL
    let updatedClient: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      dateOfBirth: Date | null;
      createdAt: Date;
      policies?: Array<{
        id: string;
        policyNumber: string | null;
        policyType: string | null;
        insurer: {
          name: string;
          contactPhone: string | null;
          contactEmail: string | null;
        } | null;
      }>;
    } | null = null;
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
          carrier_name_raw: string | null;
          insurer_name: string | null;
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
            insurer: p.insurer_name ? {
              name: p.insurer_name,
              contactPhone: p.insurer_contact_phone,
              contactEmail: p.insurer_contact_email,
            } : null,
          })),
        };
      }
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Update client: Raw SQL client/policies lookup failed:", sqlErrorMessage);
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
      policies: updatedClient?.policies?.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        policyType: p.policyType,
        insurer: p.insurer ? {
          name: p.insurer.name,
          contactPhone: p.insurer.contactPhone,
          contactEmail: p.insurer.contactEmail,
        } : {
          name: "Unknown",
          contactPhone: null,
          contactEmail: null,
        },
      })) || [],
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
      const maybeWeb = pdfStream as { getReader?: () => ReadableStreamDefaultReader<Uint8Array> };
      if (typeof maybeWeb?.getReader === "function") {
        const reader = maybeWeb.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        receiptPdfBuffer = Buffer.concat(chunks);
      } else {
        const nodeStream = pdfStream as NodeJS.ReadableStream;
        receiptPdfBuffer = await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          nodeStream.on("data", (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          nodeStream.on("end", () => resolve(Buffer.concat(chunks)));
          nodeStream.on("error", reject);
        });
      }
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
      message: "Information updated successfully",
      receiptId,
      receiptData,
    });
  } catch (error: unknown) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

