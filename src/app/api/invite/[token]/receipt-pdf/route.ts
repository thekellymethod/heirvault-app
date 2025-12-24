import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderToStream } from "@react-pdf/renderer";
import { ClientReceiptPDF } from "@/pdfs/ClientReceiptPDF";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";

export async function GET(
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
      
      // If we got the basic invite, fetch policies separately using raw SQL
      if (invite && invite.clientId) {
        try {
          const policiesResult = await prisma.$queryRaw<Array<{
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
              i.name as insurer_name,
              i.contact_phone as insurer_contact_phone,
              i.contact_email as insurer_contact_email
            FROM policies p
            INNER JOIN insurers i ON i.id = p.insurer_id
            WHERE p.client_id = ${invite.clientId}
          `;
          
          if (policiesResult) {
            invite.client = {
              ...invite.client,
              policies: policiesResult.map(p => ({
                id: p.id,
                policyNumber: p.policy_number,
                policyType: p.policy_type,
                insurer: {
                  name: p.insurer_name,
                  contactPhone: p.insurer_contact_phone,
                  contactEmail: p.insurer_contact_email,
                },
              })),
            };
          }
        } catch (sqlError: unknown) {
          const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
          console.error("Receipt PDF: Failed to fetch policies:", sqlErrorMessage);
          // Continue without policies
          invite.client = {
            ...invite.client,
            policies: [],
          };
        }
      }
    }

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 }
      );
    }

    // Get organization info if available - use raw SQL first
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
    try {
      const accessResult = await prisma.$queryRaw<Array<{
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
          o.id as org_id,
          o.name as org_name,
          o.address_line1 as org_address_line1,
          o.address_line2 as org_address_line2,
          o.city as org_city,
          o.state as org_state,
          o.postal_code as org_postal_code,
          o.phone as org_phone
        FROM attorney_client_access aca
        LEFT JOIN org_members om ON om.user_id = aca.attorney_id
        LEFT JOIN organizations o ON o.id = om.organization_id
        WHERE aca.client_id = ${invite.clientId} AND aca.is_active = true
        LIMIT 1
      `;
      
      if (accessResult && accessResult.length > 0) {
        const row = accessResult[0];
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
      console.error("Receipt PDF: Raw SQL organization lookup failed:", sqlErrorMessage);
      // Continue without organization info
      organization = null;
    }

    const receiptData = {
      receiptId: `REC-${invite.clientId}-${invite.createdAt.getTime()}`,
      client: {
        firstName: invite.client.firstName,
        lastName: invite.client.lastName,
        email: invite.client.email,
        phone: invite.client.phone,
        dateOfBirth: invite.client.dateOfBirth,
      },
      policies: invite.client.policies.map((p) => ({
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
      registeredAt: invite.client.createdAt,
      receiptGeneratedAt: new Date(),
      updateUrl: `${req.nextUrl.origin}/qr-update/${token}`,
    };

    // Generate PDF
    const pdfStream = await renderToStream(
      ClientReceiptPDF({ receiptData })
    );

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `attachment; filename="heirvault-receipt-${receiptData.receiptId}.pdf"`
    );

    return new NextResponse(pdfStream as unknown as ReadableStream, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error generating receipt PDF:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

