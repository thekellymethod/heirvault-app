// src/app/api/billing/invoices/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { requireOrgAccess } from "@/lib/permissions/orgAccess";
;
import { ArtifactType, UserRole } from "@prisma/client";

export async function GET() {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN, UserRole.ATTORNEY]);

    const membership = await prisma.org_members.findFirst({
      where: { userId: principal.dbUserId },
      select: { organizationId: true },
    });

    if (!membership) {
      return { ok: false, error: "No organization" };
    }

    await requireOrgAccess(principal, membership.organizationId);

    const invoices = await prisma.artifacts.findMany({
      where: {
        orgId: membership.organizationId,
        type: ArtifactType.BILLING_INVOICE_PDF,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return {
      ok: true,
      invoices: invoices.map((a) => ({
        id: a.id,
        createdAt: a.createdAt,
        invoiceId: ((a.metadata as Record<string, unknown> | null)?.invoiceId as string | undefined) ?? null,
        invoiceNumber: ((a.metadata as Record<string, unknown> | null)?.invoiceNumber as string | undefined) ?? null,
        amountPaid: ((a.metadata as Record<string, unknown> | null)?.amountPaid as number | undefined) ?? null,
        currency: ((a.metadata as Record<string, unknown> | null)?.currency as string | undefined) ?? null,
      })),
    };
  });
}

