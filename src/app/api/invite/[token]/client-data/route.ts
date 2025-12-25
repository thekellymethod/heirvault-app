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
    let invite: Awaited<ReturnType<typeof getOrCreateTestInvite>> | Awaited<ReturnType<typeof lookupClientInvite>> | null = await getOrCreateTestInvite(token);

    // If not a test code, do normal lookup
    if (!invite) {
      invite = await lookupClientInvite(token);
      
      // If we got the basic invite, fetch policies and beneficiaries separately using raw SQL
      if (invite && typeof invite === "object" && invite !== null && "clientId" in invite) {
        try {
          const [policiesResult, beneficiariesResult] = await Promise.all([
            prisma.$queryRaw<Array<{
              id: string,
              policy_number: string | null;
              policy_type: string | null;
              insurer_name: string,
            }>>`
              SELECT 
                p.id,
                p.policy_number,
                p.policy_type,
                i.name as insurer_name
              FROM policies p
              INNER JOIN insurers i ON i.id = p.insurer_id
              WHERE p.clientId = ${invite.clientId}
            `,
            prisma.$queryRaw<Array<{
              id: string,
              firstName: string,
              lastName: string,
              relationship: string | null;
              percentage: number | null;
            }>>`
              SELECT 
                b.id,
                b.firstName,
                b.lastName,
                b.relationship,
                COALESCE(
                  (SELECT SUM(pb.share_percentage) 
                   FROM policy_beneficiaries pb 
                   WHERE pb.beneficiary_id = b.id)::float,
                  0
                ) as percentage
              FROM beneficiaries b
              WHERE b.clientId = ${invite.clientId}
            `,
          ]);
          
          const inviteAny = invite as any;
          inviteAny.client = {
            ...inviteAny.client,
            policies: (policiesResult || []).map(p => ({
              id: p.id,
              policyNumber: p.policy_number,
              policyType: p.policy_type,
              insurer: {
                name: p.insurer_name,
              },
            })),
            beneficiaries: (beneficiariesResult || []).map(b => ({
              id: b.id,
              firstName: b.firstName,
              lastName: b.lastName,
              relationship: b.relationship,
              percentage: b.percentage,
            })),
          };
        } catch (sqlError: unknown) {
          const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
          console.error("Client data: Failed to fetch policies/beneficiaries:", sqlErrorMessage);
          // Continue with empty arrays
          const inviteAny = invite as any;
          inviteAny.client = {
            ...inviteAny.client,
            policies: [],
            beneficiaries: [],
          };
        }
      }
    }

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 }
      );
    }

    const inviteAny = invite as any;
    return NextResponse.json({
      email: inviteAny.client.email,
      phone: inviteAny.client.phone,
      policies: inviteAny.client.policies.map((p: any) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        insurerName: p.insurer.name,
        policyType: p.policyType,
      })),
      beneficiaries: inviteAny.client.beneficiaries.map((b: any) => ({
        id: b.id,
        firstName: b.firstName,
        lastName: b.lastName,
        relationship: b.relationship,
        percentage: b.percentage,
      })),
      address: {
        street: inviteAny.client.addressLine1 || "",
        city: inviteAny.client.city || "",
        state: inviteAny.client.state || "",
        zipCode: inviteAny.client.postalCode || "",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching client data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

