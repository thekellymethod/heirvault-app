// src/lib/permissions/orgAccess.ts
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/permissions/guard";
import { UserRole } from "@prisma/client";
import type { AppPrincipal } from "@/lib/permissions/guard";

export async function requireOrgAccess(principal: AppPrincipal, orgId: string) {
  if (principal.role === UserRole.ADMIN) return;

  const membership = await prisma.org_members.findFirst({
    where: { userId: principal.dbUserId, organizationId: orgId },
    select: { id: true },
  });

  if (!membership) {
    throw new HttpError(403, "No access to organization");
  }
}

