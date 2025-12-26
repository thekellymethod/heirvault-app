import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateTestInvite } from "@/lib/test-invites";
import { lookupClientInvite } from "@/lib/invite-lookup";

type PolicyRow = {
  id: string;
  policy_number: string | null;
  policy_type: string | null;
  insurer_name: string;
};

type BeneficiaryRow = {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  percentage: number | null;
};

type ClientData = {
  email: string | null;
  phone: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  policies?: Array<{
    id: string;
    policyNumber: string | null;
    policyType: string | null;
    insurer: { name: string };
  }>;
  beneficiaries?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    relationship: string | null;
    percentage: number | null;
  }>;
};

type InviteWithClient = {
  clientId: string;
  client: ClientData;
};

function isInviteWithClient(value: unknown): value is InviteWithClient {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.clientId !== "string") return false;
  const c = v.client as unknown;
  if (!c || typeof c !== "object") return false;
  const client = c as Record<string, unknown>;
  return "email" in client && "phone" in client;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    let invite:
      | Awaited<ReturnType<typeof getOrCreateTestInvite>>
      | Awaited<ReturnType<typeof lookupClientInvite>>
      | null = await getOrCreateTestInvite(token);

    if (!invite) invite = await lookupClientInvite(token);

    if (!invite) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    // Base response defaults (never mutate `invite` with `any`)
    const response = {
      email: "",
      phone: "",
      policies: [] as Array<{
        id: string;
        policyNumber: string | null;
        insurerName: string;
        policyType: string | null;
      }>,
      beneficiaries: [] as Array<{
        id: string;
        firstName: string;
        lastName: string;
        relationship: string | null;
        percentage: number | null;
      }>,
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
      },
    };

    if (isInviteWithClient(invite)) {
      response.email = invite.client.email ?? "";
      response.phone = invite.client.phone ?? "";
      response.address.street = invite.client.addressLine1 ?? "";
      response.address.city = invite.client.city ?? "";
      response.address.state = invite.client.state ?? "";
      response.address.zipCode = invite.client.postalCode ?? "";

      // Try to use preloaded arrays if present
      const prePolicies = invite.client.policies ?? [];
      const preBeneficiaries = invite.client.beneficiaries ?? [];

      // If not present, fetch them via SQL
      if (prePolicies.length === 0 || preBeneficiaries.length === 0) {
        try {
          const [policiesResult, beneficiariesResult] = await Promise.all([
            prisma.$queryRaw<PolicyRow[]>`
              SELECT
                p.id,
                p.policy_number,
                p.policy_type,
                i.name as insurer_name
              FROM policies p
              INNER JOIN insurers i ON i.id = p.insurer_id
              WHERE p.client_id = ${invite.clientId}
            `,
            prisma.$queryRaw<BeneficiaryRow[]>`
              SELECT
                b.id,
                b."firstName",
                b."lastName",
                b.relationship,
                COALESCE(
                  (SELECT SUM(pb.share_percentage)
                   FROM policy_beneficiaries pb
                   WHERE pb.beneficiary_id = b.id)::float,
                  0
                ) as percentage
              FROM beneficiaries b
              WHERE b.client_id = ${invite.clientId}
            `,
          ]);

          response.policies = (policiesResult ?? []).map((p) => ({
            id: p.id,
            policyNumber: p.policy_number,
            insurerName: p.insurer_name,
            policyType: p.policy_type,
          }));

          response.beneficiaries = (beneficiariesResult ?? []).map((b) => ({
            id: b.id,
            firstName: b.firstName,
            lastName: b.lastName,
            relationship: b.relationship,
            percentage: b.percentage,
          }));
        } catch (sqlError: unknown) {
          const sqlErrorMessage =
            sqlError instanceof Error ? sqlError.message : "Unknown error";
          console.error(
            "Client data: Failed to fetch policies/beneficiaries:",
            sqlErrorMessage
          );
          // Keep empty arrays
        }
      } else {
        response.policies = prePolicies.map((p) => ({
          id: p.id,
          policyNumber: p.policyNumber,
          insurerName: p.insurer.name,
          policyType: p.policyType,
        }));

        response.beneficiaries = preBeneficiaries.map((b) => ({
          id: b.id,
          firstName: b.firstName,
          lastName: b.lastName,
          relationship: b.relationship,
          percentage: b.percentage,
        }));
      }
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Error fetching client data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
