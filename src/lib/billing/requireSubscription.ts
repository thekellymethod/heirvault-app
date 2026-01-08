// src/lib/billing/requireSubscription.ts
;
import { requireAuthPrincipal } from "@/lib/permissions/guard";
import { HttpError } from "@/lib/permissions/guard";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/auth/admin-bypass";

/**
 * Require organization subscription to be active
 * Admin users bypass this requirement
 */
export async function requireOrgSubscription() {
  const principal = await requireAuthPrincipal();

  const { findMany: findManyMembers, findUnique: findUniqueOrg } = await import("@/lib/db");
  
  type OrgMemberRecord = {
    id: string;
    userId: string;
    organizationId: string;
  };
  
  type OrganizationRecord = {
    id: string;
    name: string;
    billingStatus: string;
    currentPeriodEnd: string | null;
    [key: string]: unknown;
  };

  // Admin bypass - admins can perform all operations regardless of billing status
  const isAdmin = await isAdminUser();
  
  // Get org membership
  const memberships = await findManyMembers<OrgMemberRecord>("org_members", {
    where: { userId: principal.dbUserId },
    limit: 1,
  });

  if (!memberships || memberships.length === 0) {
    throw new HttpError(403, "No organization found");
  }

  const membership = memberships[0];
  
  // Get organization details
  const org = await findUniqueOrg<OrganizationRecord>("organizations", {
    id: membership.organizationId,
  });

  if (!org) {
    throw new HttpError(403, "Organization not found");
  }

  if (isAdmin) {
    // Still return org for admins, but skip billing check
    return { principal, org };
  }

  // Check subscription status
  if (org.billingStatus !== "ACTIVE" && org.billingStatus !== "TRIALING") {
    // Redirect to billing page
    redirect("/dashboard/billing");
  }

  return { principal, org };
}

