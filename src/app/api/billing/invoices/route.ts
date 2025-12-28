// src/app/api/billing/invoices/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { requireOrgAccess } from "@/lib/permissions/orgAccess";
import { prisma } from "@/lib/db";
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
        invoiceId: (a.metadata as any)?.invoiceId ?? null,
        invoiceNumber: (a.metadata as any)?.invoiceNumber ?? null,
        amountPaid: (a.metadata as any)?.amountPaid ?? null,
        currency: (a.metadata as any)?.currency ?? null,
      })),
    };
  });
}

