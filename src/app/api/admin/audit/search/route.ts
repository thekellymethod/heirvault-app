// src/app/api/admin/audit/search/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN]);

    const { clientId, action, limit } = await req.json().catch(() => ({}));

    const take = Math.min(Math.max(Number(limit ?? 100), 1), 500);

    const where: {
      clientId?: string;
      action?: string;
    } = {};
    if (clientId && typeof clientId === "string") where.clientId = clientId;
    if (action && typeof action === "string") where.action = action;

    const logs = await prisma.audit_logs.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });

    return {
      ok: true,
      logs: logs.map((l) => ({
        id: l.id,
        createdAt: l.createdAt,
        clientId: l.clientId,
        inviteId: l.inviteId ?? null,
        action: l.action,
        actorType: l.actorType,
        actorId: l.actorId ?? null,
        metadata: l.metadata ?? null,
      })),
    };
  });
}

