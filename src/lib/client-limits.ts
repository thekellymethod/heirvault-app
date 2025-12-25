import { prisma } from "./db";
import { getClientLimitForPlan } from "./plan";
import { getCurrentUserWithOrg } from "./authz";

export async function assertCanCreateClient() {
  const { user, orgMember } = await getCurrentUserWithOrg();

  if (!user || !orgMember) {
    throw new Error("Unauthorized");
  }

  const orgResult = await prisma.$queryRawUnsafe<Array<{
    id: string,
    billing_plan: string,
    client_count: number;
  }>>(
    `SELECT 
      o.id,
      o.billing_plan,
      COUNT(c.id)::int as client_count
    FROM organizations o
    LEFT JOIN clients c ON c.org_id = o.id
    WHERE o.id = $1
    GROUP BY o.id, o.billing_plan
    LIMIT 1`,
    orgMember.organizationId
  );

  if (!orgResult || orgResult.length === 0) {
    throw new Error("No organization");
  }

  const orgData = orgResult[0];
  const billingPlan = orgData.billing_plan as "FREE" | "SOLO" | "SMALL_FIRM" | "ENTERPRISE";
  const clientCount = orgData.client_count;

  const limit = getClientLimitForPlan(billingPlan);
  if (limit === null) {
    // Unlimited
    const org = {
      id: orgData.id,
      billingPlan,
      clients: [] as Array<{ id: string }>,
    };
    return { user, org };
  }

  if (clientCount >= limit) {
    const err = new Error("Client limit reached") as Error & { code?: string, limit?: number };
    err.code = "PLAN_LIMIT";
    err.limit = limit;
    throw err;
  }

  const org = {
    id: orgData.id,
    billingPlan,
    clients: [] as Array<{ id: string }>,
  };
  return { user, org };
}

