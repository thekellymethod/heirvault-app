// src/lib/org/getOrgContext.ts
;
import { HttpError } from "@/lib/permissions/guard";
import type { AppPrincipal } from "@/lib/permissions/guard";

type OrgMemberRecord = {
  id: string;
  userId: string;
  organizationId: string;
  role: string | null;
};

type OrganizationRecord = {
  id: string;
  name: string;
  billingStatus?: string | null;
  currentPeriodEnd?: string | Date | null;
  stripeCustomerId?: string | null;
};

export async function getOrgContext(principal: AppPrincipal) {
  const { findMany: findManyMembers, findUnique: findUniqueOrg } = await import("@/lib/db");
  
  // Get organization membership
  const memberships = await findManyMembers<OrgMemberRecord>("org_members", {
    where: { userId: principal.dbUserId },
    limit: 1,
  });

  if (!memberships || memberships.length === 0) {
    throw new HttpError(403, "No organization");
  }

  const membership = memberships[0];

  // Get organization details
  const org = await findUniqueOrg<OrganizationRecord>("organizations", { 
    id: membership.organizationId 
  });

  if (!org) {
    throw new HttpError(403, "Organization not found");
  }

  return {
    orgId: membership.organizationId,
    org: {
      id: org.id,
      name: org.name,
      billingStatus: org.billingStatus || null,
      currentPeriodEnd: org.currentPeriodEnd || null,
      stripeCustomerId: org.stripeCustomerId || null,
    },
    orgRole: membership.role ?? null,
  };
}

