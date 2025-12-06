import { prisma } from "./db";
import { getClientLimitForPlan } from "./plan";
import { getCurrentUserWithOrg } from "./authz";

export async function assertCanCreateClient() {
  const { user, orgMember } = await getCurrentUserWithOrg();

  if (!user || !orgMember) {
    throw new Error("Unauthorized");
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgMember.organizationId },
    select: {
      id: true,
      billingPlan: true,
      clients: {
        select: { id: true },
      },
    },
  });

  if (!org) {
    throw new Error("No organization");
  }

  const limit = getClientLimitForPlan(org.billingPlan);
  if (limit === null) {
    // Unlimited
    return { user, org };
  }

  if (org.clients.length >= limit) {
    const err: any = new Error("Client limit reached");
    err.code = "PLAN_LIMIT";
    err.limit = limit;
    throw err;
  }

  return { user, org };
}

