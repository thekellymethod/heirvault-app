// src/app/api/admin/clients/[clientId]/access/revoke/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
;
import { UserRole } from "@prisma/client";

export async function POST(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN]);

    const { clientId } = await ctx.params;
    const { userId } = await req.json().catch(() => ({}));
    if (!userId || typeof userId !== "string") throw new Error("userId required");

    // Soft delete by setting isActive = false
    await prisma.attorneyClientAccess.updateMany({
      where: {
        attorneyId: userId,
        clientId,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    return { ok: true };
  });
}

