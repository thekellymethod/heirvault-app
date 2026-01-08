// src/app/api/admin/clients/[clientId]/access/grant/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
;
import { UserRole } from "@/lib/db/enums";
import { randomUUID } from "crypto";

export async function POST(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.attorney]); // Note: UserRole only has 'attorney', not 'ADMIN'

    const { clientId } = await ctx.params;
    const { userId, canViewSensitive, canDownload } = await req.json().catch(() => ({}));

    if (!userId || typeof userId !== "string") {
      throw new Error("userId required");
    }

    const { findMany: findManyAccess, update: updateAccess, create: createAccess } = await import("@/lib/db");
    
    // Check if grant already exists
    const existingGrants = await findManyAccess("attorney_client_access", {
      where: {
        attorneyId: userId,
        clientId,
      },
      limit: 1,
    });
    
    const existing = existingGrants && existingGrants.length > 0 ? existingGrants[0] : null;

    if (existing) {
      await updateAccess("attorney_client_access", { id: (existing as any).id }, {
        canViewSensitive: !!canViewSensitive,
        canDownload: !!canDownload,
        isActive: true,
        revokedAt: null,
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
    } else {
      await createAccess("attorney_client_access", {
        id: randomUUID(),
        attorneyId: userId,
        clientId,
        canViewSensitive: !!canViewSensitive,
        canDownload: !!canDownload,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
    }

    return { ok: true };
  });
}

