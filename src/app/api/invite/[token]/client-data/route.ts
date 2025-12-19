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
      
      // If we got the basic invite, fetch policies and beneficiaries separately using raw SQL
      if (invite && invite.clientId) {
        try {
          const [policiesResult, beneficiariesResult] = await Promise.all([
            prisma.$queryRaw<Array<{
              id: string;
              policy_number: string | null;
              policy_type: string | null;
              insurer_name: string;
            }>>`
              SELECT 
                p.id,
                p.policy_number,
                p.policy_type,
                i.name as insurer_name
              FROM policies p
              INNER JOIN insurers i ON i.id = p.insurer_id
              WHERE p.client_id = ${invite.clientId}
            `,
            prisma.$queryRaw<Array<{
              id: string;
              first_name: string;
              last_name: string;
              relationship: string | null;
              percentage: number | null;
            }>>`
              SELECT 
                b.id,
                b.first_name,
                b.last_name,
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
          
          invite.client = {
            ...invite.client,
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
              firstName: b.first_name,
              lastName: b.last_name,
              relationship: b.relationship,
              percentage: b.percentage,
            })),
          };
        } catch (sqlError: any) {
          console.error("Client data: Failed to fetch policies/beneficiaries:", sqlError.message);
          // Continue with empty arrays
          invite.client = {
            ...invite.client,
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

    return NextResponse.json({
      email: invite.client.email,
      phone: invite.client.phone,
      policies: invite.client.policies.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        insurerName: p.insurer.name,
        policyType: p.policyType,
      })),
      beneficiaries: invite.client.beneficiaries.map((b) => ({
        id: b.id,
        firstName: b.firstName,
        lastName: b.lastName,
        relationship: b.relationship,
        percentage: b.percentage,
      })),
      address: {
        street: invite.client.addressLine1 || "",
        city: invite.client.city || "",
        state: invite.client.state || "",
        zipCode: invite.client.postalCode || "",
      },
    });
  } catch (error: any) {
    console.error("Error fetching client data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

