import { NextRequest, NextResponse } from "next/server";
;
import { requireAuth } from "@/lib/utils/clerk";
import { randomUUID } from "crypto";

type PolicyLocatorResult = {
  id: string;
  policyNumber: string | null;
  policyType: string | null;
  insurerName: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  beneficiaries: Array<{
    firstName: string;
    lastName: string;
    relationship: string | null;
  }>;
};

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickAuditAction(): string {
  // Return audit action string
  return "GLOBAL_POLICY_SEARCH_PERFORMED";
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);

    const firstName = (searchParams.get("firstName") ?? "").trim();
    const lastName = (searchParams.get("lastName") ?? "").trim();
    const dateOfBirthParam = (searchParams.get("dateOfBirth") ?? "").trim();

    const policyNumberParam = (searchParams.get("policyNumber") ?? "").trim();
    const proofOfDeathCertNumber = (searchParams.get("proofOfDeathCertNumber") ?? "").trim();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const dateOfBirth = parseDate(dateOfBirthParam);

    // Use Supabase to query clients with policies
    const { findMany: findManyInsurers, findMany: findManyBeneficiaries, findMany: findManyPolicyBeneficiaries, getDb } = await import("@/lib/db");
    const db = getDb();
    
    // Build query for clients
    // Database uses snake_case: first_name, last_name, date_of_birth
    let clientQuery = db
      .from("clients")
      .select("*")
      .ilike("first_name", `%${firstName}%`)
      .ilike("last_name", `%${lastName}%`);
    
    if (dateOfBirth) {
      clientQuery = clientQuery.eq("date_of_birth", dateOfBirth.toISOString().split('T')[0]); // date_of_birth is a date type
    }
    
    const { data: clientsData } = await clientQuery.limit(100);
    // Database returns snake_case column names
    const clients = (clientsData || []) as Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      date_of_birth: string | null;
    }>;
    
    // Fetch policies for each client
    const clientsWithPolicies = await Promise.all(
      clients.map(async (client) => {
        // Database uses snake_case: client_id, policy_number, policy_type, insurer_id
        let policyQuery = db
          .from("policies")
          .select("*")
          .eq("client_id", client.id);
        
        if (policyNumberParam) {
          policyQuery = policyQuery.ilike("policy_number", `%${policyNumberParam}%`);
        }
        
        const { data: policiesData } = await policyQuery;
        // Database returns snake_case column names
        const policies = (policiesData || []) as Array<{
          id: string;
          policy_number: string | null;
          policy_type: string | null;
          insurer_id: string | null;
        }>;
        
        // Fetch insurers for policies
        const policiesWithInsurers = await Promise.all(
          policies.map(async (policy) => {
            const insurer = policy.insurer_id 
              ? await findManyInsurers("insurers", { where: { id: policy.insurer_id }, limit: 1 })
              : null;
            
            // Fetch policy beneficiaries
            const policyBeneficiaries = await findManyPolicyBeneficiaries("policy_beneficiaries", {
              where: { policyId: policy.id },
            });
            
            // Fetch beneficiaries
            const beneficiaries = await Promise.all(
              (policyBeneficiaries || []).map(async (pb: any) => {
                const beneficiary = await findManyBeneficiaries("beneficiaries", {
                  where: { id: pb.beneficiaryId },
                  limit: 1,
                });
                return beneficiary && beneficiary.length > 0 ? beneficiary[0] : null;
              })
            );
            
            return {
              id: policy.id,
              policy_number: policy.policy_number,
              policy_type: policy.policy_type,
              insurer_id: policy.insurer_id,
              insurers: insurer && insurer.length > 0 ? { name: (insurer[0] as any).name } : null,
              policy_beneficiaries: beneficiaries.filter((b: any) => b !== null).map((b: any) => ({
                beneficiaries: {
                  first_name: b.first_name,
                  last_name: b.last_name,
                  relationship: b.relationship,
                },
              })),
            };
          })
        );
        
        return {
          id: client.id,
          first_name: client.first_name,
          last_name: client.last_name,
          email: client.email,
          date_of_birth: client.date_of_birth,
          policies: policiesWithInsurers,
        };
      })
    );

    const results: PolicyLocatorResult[] = clientsWithPolicies.flatMap((client: any) =>
      (client.policies || []).map((policy: any) => {
        const beneficiaries = (policy.policy_beneficiaries || []).map((pb: any) => ({
          firstName: pb.beneficiaries?.first_name || "",
          lastName: pb.beneficiaries?.last_name || "",
          relationship: pb.beneficiaries?.relationship || null,
        }));

        return {
          id: policy.id,
          policyNumber: policy.policy_number ?? null,
          policyType: policy.policy_type ?? null,
          insurerName: policy.insurers?.name ?? null,
          client: {
            id: client.id,
            firstName: client.first_name,
            lastName: client.last_name,
            email: client.email,
          },
          beneficiaries,
        };
      })
    );

    // Audit log (best effort; does not block response)
    try {
      const { findMany: findManyMembers, create: createAudit } = await import("@/lib/db");
      
      // Database uses snake_case: user_id, organization_id
      type OrgMemberRecord = {
        id: string;
        user_id: string;
        organization_id: string;
      };
      
      const memberships = await findManyMembers<OrgMemberRecord>("org_members", {
        where: { userId: user.id }, // findMany converts camelCase to snake_case
        limit: 1,
      });

      const member = memberships && memberships.length > 0 ? memberships[0] : null;
      const action = pickAuditAction();

      await createAudit("audit_logs", {
        id: randomUUID(),
        action,
        message: `Global policy search: ${firstName} ${lastName}${
          dateOfBirthParam ? ` (DOB: ${dateOfBirthParam})` : ""
        }${proofOfDeathCertNumber ? ` | Death Cert: ${proofOfDeathCertNumber}` : ""} | Results: ${
          results.length
        }`,
        userId: user.id, // create() converts camelCase to snake_case
        orgId: member?.organization_id ?? null,
        createdAt: new Date().toISOString(),
      } as any);
    } catch (auditError: unknown) {
      console.error("Failed to log global search audit:", auditError);
    }

    return NextResponse.json({
      policies: results,
      searchMetadata: {
        proofOfDeathCertNumber: proofOfDeathCertNumber || null,
        searchedBy: user.id,
        searchedAt: new Date().toISOString(),
        scope: "global",
      },
      disclaimer:
        "This search queries the private, voluntary registry database across all organizations. Results only include information that has been voluntarily registered. This is not a comprehensive database and does not search insurer records.",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isAuthError = errorMessage === "Unauthorized" || errorMessage === "Forbidden";
    console.error("Error in global policy locator:", error);
    return NextResponse.json(
      { error: errorMessage || "Internal server error" },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
