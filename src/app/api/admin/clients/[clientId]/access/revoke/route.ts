// src/app/api/admin/clients/[clientId]/access/revoke/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
;
import { UserRole } from "@/lib/db/enums";

export async function POST(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.attorney]); // Note: UserRole only has 'attorney', not 'ADMIN'

    const { clientId } = await ctx.params;
    const { userId } = await req.json().catch(() => ({}));
    if (!userId || typeof userId !== "string") throw new Error("userId required");

    const { findMany: findManyAccess, update: updateAccess } = await import("@/lib/db");
    
    // Soft delete by setting isActive = false
    const grants = await findManyAccess("attorney_client_access", {
      where: {
        attorneyId: userId,
        clientId,
      },
    });
    
    for (const grant of grants || []) {
      await updateAccess("attorney_client_access", { id: (grant as any).id }, {
        isActive: false,
        revokedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
    }

    return { ok: true };
  });
}

