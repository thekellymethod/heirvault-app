// src/app/api/billing/invoices/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { requireOrgAccess } from "@/lib/permissions/orgAccess";
import { UserRole } from "@/lib/db/enums";
import { ArtifactType } from "@/lib/db/enums";
import { organizationIdFromMemberRow } from "@/lib/org/membershipRow";

export async function GET() {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.attorney]);

    const { findMany: findManyMembers, findMany: findManyArtifacts } = await import("@/lib/db");
    
    type OrgMemberRecord = {
      id: string;
      userId: string;
      organizationId: string;
    };
    
    const members = await findManyMembers<OrgMemberRecord>("org_members", {
      where: { userId: principal.dbUserId },
      limit: 1,
    });

    if (!members || members.length === 0) {
      return { ok: false, error: "No organization" };
    }

    const membership = members[0];
    const orgId = organizationIdFromMemberRow(membership as Record<string, unknown>);
    if (!orgId) {
      return { ok: false, error: "No organization" };
    }
    await requireOrgAccess(principal, orgId);

    type ArtifactRecord = {
      id: string;
      orgId: string;
      type: string;
      createdAt: string;
      metadata: Record<string, unknown> | null;
    };
    
    const invoices = await findManyArtifacts<ArtifactRecord>("artifacts", {
      where: {
        orgId,
        type: ArtifactType.BILLING_INVOICE_PDF,
      },
      orderBy: { column: "createdAt", ascending: false },
      limit: 200,
    });

    return {
      ok: true,
      invoices: (invoices || []).map((a) => ({
        id: a.id,
        createdAt: typeof a.createdAt === 'string' ? a.createdAt : new Date(a.createdAt).toISOString(),
        invoiceId: (a.metadata?.invoiceId as string | undefined) ?? null,
        invoiceNumber: (a.metadata?.invoiceNumber as string | undefined) ?? null,
        amountPaid: (a.metadata?.amountPaid as number | undefined) ?? null,
        currency: (a.metadata?.currency as string | undefined) ?? null,
      })),
    };
  });
}

