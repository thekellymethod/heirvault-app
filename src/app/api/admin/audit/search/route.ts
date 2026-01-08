// src/app/api/admin/audit/search/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { UserRole } from "@/lib/db/enums";

export async function POST(req: Request) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.attorney]); // Note: UserRole only has 'attorney', not 'ADMIN'

    const { clientId, action, limit } = await req.json().catch(() => ({}));

    const take = Math.min(Math.max(Number(limit ?? 100), 1), 500);

    const { findMany: findManyAuditLogs } = await import("@/lib/db");
    
    type AuditLogRecord = {
      id: string;
      createdAt: string;
      clientId: string | null;
      inviteId: string | null;
      action: string;
      actorType: string | null;
      actorId: string | null;
      metadata: Record<string, unknown> | null;
    };
    
    const where: Record<string, unknown> = {};
    if (clientId && typeof clientId === "string") where.clientId = clientId;
    if (action && typeof action === "string") where.action = action;

    const logs = await findManyAuditLogs<AuditLogRecord>("audit_logs", {
      where,
      orderBy: { column: "createdAt", ascending: false },
      limit: take,
    });

    return {
      ok: true,
      logs: (logs || []).map((l) => ({
        id: l.id,
        createdAt: typeof l.createdAt === 'string' ? l.createdAt : new Date(l.createdAt).toISOString(),
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

