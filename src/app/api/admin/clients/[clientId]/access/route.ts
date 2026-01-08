// src/app/api/admin/clients/[clientId]/access/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
;
import { UserRole } from "@/lib/db/enums";

export async function GET(_: Request, ctx: { params: Promise<{ clientId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN]);

    const { clientId } = await ctx.params;

    const { findMany: findManyAccess, findMany: findManyUsers } = await import("@/lib/db");
    
    const accessGrants = await findManyAccess("attorney_client_access", {
      where: { clientId, isActive: true },
      orderBy: { column: "grantedAt", ascending: false },
      limit: 200,
    });
    
    // Fetch users for each grant
    const grants = await Promise.all(
      (accessGrants || []).map(async (grant: any) => {
        const users = await findManyUsers("users", {
          where: { id: grant.attorneyId },
          limit: 1,
        });
        const user = users && users.length > 0 ? users[0] : null;
        return {
          ...grant,
          users: user || null,
        };
      })
    );

    return {
      ok: true,
      grants: grants
        .filter((g: any) => g.users !== null)
        .map((g: any) => ({
          id: g.id,
          userId: g.attorneyId,
          userEmail: g.users.email,
          userName: `${g.users.firstName ?? ""} ${g.users.lastName ?? ""}`.trim() || g.users.email,
          role: g.users.role,
          canViewSensitive: g.canViewSensitive || false,
          canDownload: g.canDownload || false,
          createdAt: g.grantedAt || g.createdAt,
        })),
    };
  });
}

