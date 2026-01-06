// src/lib/org/getOrgContext.ts
;
import { HttpError } from "@/lib/permissions/guard";
import type { AppPrincipal } from "@/lib/permissions/guard";

export async function getOrgContext(principal: AppPrincipal) {
  const membership = await prisma.org_members.findFirst({
    where: { userId: principal.dbUserId },
    select: {
      organizationId: true,
      role: true,
      organizations: {
        select: {
          id: true,
          name: true,
          billingStatus: true,
          currentPeriodEnd: true,
          stripeCustomerId: true,
        },
      },
    },
  });

  if (!membership) {
    throw new HttpError(403, "No organization");
  }

  return {
    orgId: membership.organizationId,
    org: membership.organizations,
    orgRole: membership.role ?? null,
  };
}

