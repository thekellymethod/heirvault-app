// src/lib/permissions/orgAccess.ts
;
import { HttpError } from "@/lib/permissions/guard";
import type { AppPrincipal } from "@/lib/permissions/guard";

export async function requireOrgAccess(principal: AppPrincipal, orgId: string) {
  // Check roles array for ADMIN (admin is determined by roles array, not UserRole enum)
  if (principal.roles.includes("ADMIN")) return;

  const { findMany } = await import("@/lib/db");
  const memberships = await findMany("org_members", {
    where: { userId: principal.dbUserId, organizationId: orgId },
    limit: 1,
  });

  if (!memberships || memberships.length === 0) {
    throw new HttpError(403, "No access to organization");
  }
}

