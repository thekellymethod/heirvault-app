// src/app/api/admin/clients/[clientId]/access/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET(_: Request, ctx: { params: Promise<{ clientId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN]);

    const { clientId } = await ctx.params;

    const grants = await prisma.attorneyClientAccess.findMany({
      where: { clientId, isActive: true },
      include: { users: { select: { id: true, role: true, clerkId: true, email: true, firstName: true, lastName: true } } },
      orderBy: { grantedAt: "desc" },
      take: 200,
    });

    return {
      ok: true,
      grants: grants.map((g) => ({
        id: g.id,
        userId: g.attorneyId,
        userEmail: g.users.email,
        userName: `${g.users.firstName ?? ""} ${g.users.lastName ?? ""}`.trim() || g.users.email,
        role: g.users.role,
        canViewSensitive: g.canViewSensitive,
        canDownload: g.canDownload,
        createdAt: g.grantedAt,
      })),
    };
  });
}

