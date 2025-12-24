import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Try to get or create test invite first
    let invite = await getOrCreateTestInvite(token);

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
            created_at: Date;
          }>>`
            SELECT 
              p.id,
              p.policy_number,
              p.policy_type,
              i.name as insurer_name,
              i.contact_phone as insurer_contact_phone,
              i.contact_email as insurer_contact_email,
              p.created_at
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
                createdAt: p.created_at,
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
          console.error("Receipt: Failed to fetch policies:", sqlErrorMessage);
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
      country: string | null;
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
        org_country: string | null;
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
          o.country as org_country,
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
          country: row.org_country,
          phone: row.org_phone,
        };
      }
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Receipt: Raw SQL organization lookup failed:", sqlErrorMessage);
      // Continue without organization info
      organization = null;
    }

    return NextResponse.json({
      receiptId: `REC-${invite.clientId}-${invite.createdAt.getTime()}`,
      client: {
        id: invite.client.id,
        firstName: invite.client.firstName,
        lastName: invite.client.lastName,
        email: invite.client.email,
        phone: invite.client.phone,
        dateOfBirth: invite.client.dateOfBirth,
      },
      policies: (invite.client.policies || []).map((p: {
        id: string;
        policyNumber: string | null;
        policyType: string | null;
        insurer: {
          name: string;
          contactPhone: string | null;
          contactEmail: string | null;
        } | null;
      }) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        policyType: p.policyType,
        insurer: {
          name: p.insurer?.name || p.insurer_name || "Unknown",
          contactPhone: p.insurer?.contactPhone || null,
          contactEmail: p.insurer?.contactEmail || null,
        },
        createdAt: p.createdAt,
      })),
      organization: organization
        ? {
            name: organization.name,
            addressLine1: organization.addressLine1,
            addressLine2: organization.addressLine2,
            city: organization.city,
            state: organization.state,
            postalCode: organization.postalCode,
            country: organization.country,
            phone: organization.phone,
          }
        : null,
      registeredAt: invite.client.createdAt,
      receiptGeneratedAt: new Date(),
    });
  } catch (error: unknown) {
    console.error("Error generating receipt:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

