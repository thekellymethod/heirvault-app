import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";

type InviteClient = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  dateOfBirth?: Date | null;
  createdAt?: Date;
};

type InviteShape = {
  clientId: string;
  client: InviteClient & {
    policies?: PolicyOut[];
  };
  createdAt: Date;
};

type PolicyRow = {
  id: string;
  policy_number: string | null;
  policy_type: string | null;
  insurer_name: string;
  insurer_contact_phone: string | null;
  insurer_contact_email: string | null;
  created_at: Date;
};

type PolicyOut = {
  id: string;
  policyNumber: string | null;
  policyType: string | null;
  createdAt: Date;
  insurer: {
    name: string;
    contactPhone: string | null;
    contactEmail: string | null;
  };
};

type OrgRow = {
  org_id: string;
  org_name: string;
  org_address_line1: string | null;
  org_address_line2: string | null;
  org_city: string | null;
  org_state: string | null;
  org_postal_code: string | null;
  org_country: string | null;
  org_phone: string | null;
};

type OrgOut = {
  id: string;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
};

function isInviteShape(value: unknown): value is InviteShape {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.clientId === "string" &&
    typeof v.createdAt === "object" &&
    v.createdAt instanceof Date &&
    typeof v.client === "object" &&
    v.client !== null
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const testInvite = await getOrCreateTestInvite(token);
    const invite = testInvite ?? (await lookupClientInvite(token));

    if (!isInviteShape(invite)) {
      return NextResponse.json({ error: "Invalid invitation code" }, { status: 404 });
    }

    const clientId = invite.clientId;
    const inviteClient = invite.client;
    const inviteCreatedAt = invite.createdAt;

    // Fetch policies via raw SQL
    let policies: PolicyOut[] = [];
    try {
      const rows = await prisma.$queryRaw<PolicyRow[]>`
        SELECT
          p.id,
          p.policy_number,
          p.policy_type,
          i.name AS insurer_name,
          i.contact_phone AS insurer_contact_phone,
          i.contact_email AS insurer_contact_email,
          p.created_at
        FROM policies p
        INNER JOIN insurers i ON i.id = p.insurer_id
        WHERE p.client_id = ${clientId}
        ORDER BY p.created_at DESC
      `;

      policies = (rows ?? []).map((p) => ({
        id: p.id,
        policyNumber: p.policy_number,
        policyType: p.policy_type,
        createdAt: p.created_at,
        insurer: {
          name: p.insurer_name,
          contactPhone: p.insurer_contact_phone,
          contactEmail: p.insurer_contact_email,
        },
      }));
    } catch (sqlError: unknown) {
      const msg = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Receipt: Failed to fetch policies:", msg);
      policies = [];
    }

    // Fetch organization via raw SQL
    let organization: OrgOut | null = null;
    try {
      const accessRows = await prisma.$queryRaw<OrgRow[]>`
        SELECT
          o.id AS org_id,
          o.name AS org_name,
          o.address_line1 AS org_address_line1,
          o.address_line2 AS org_address_line2,
          o.city AS org_city,
          o.state AS org_state,
          o.postal_code AS org_postal_code,
          o.country AS org_country,
          o.phone AS org_phone
        FROM attorney_client_access aca
        LEFT JOIN org_members om ON om.user_id = aca.attorney_id
        LEFT JOIN organizations o ON o.id = om.organization_id
        WHERE aca.client_id = ${clientId} AND aca.is_active = true
        LIMIT 1
      `;

      if (accessRows?.length) {
        const row = accessRows[0];
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
      const msg = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Receipt: Raw SQL organization lookup failed:", msg);
      organization = null;
    }

    return NextResponse.json({
      receiptId: `REC-${clientId}-${inviteCreatedAt.getTime()}`,
      client: {
        id: inviteClient.id ?? "",
        firstName: inviteClient.firstName ?? "",
        lastName: inviteClient.lastName ?? "",
        email: inviteClient.email ?? "",
        phone: inviteClient.phone ?? null,
        dateOfBirth: inviteClient.dateOfBirth ?? null,
      },
      policies: policies.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        policyType: p.policyType,
        insurer: {
          name: p.insurer.name || "Unknown",
          contactPhone: p.insurer.contactPhone ?? null,
          contactEmail: p.insurer.contactEmail ?? null,
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
      registeredAt: inviteClient.createdAt ?? new Date(),
      receiptGeneratedAt: new Date(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error generating receipt:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
