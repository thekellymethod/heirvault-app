// src/app/api/admin/audit/access-events/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { UserRole } from "@/lib/db/enums";

export async function POST(req: Request) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.attorney]); // Note: UserRole only has 'attorney', not 'ADMIN'

    const { documentId, limit } = await req.json().catch(() => ({}));
    const take = Math.min(Math.max(Number(limit ?? 100), 1), 500);

    const { findMany: findManyAccessEvents } = await import("@/lib/db");
    
    type AccessEventRecord = {
      id: string;
      createdAt: string;
      documentId: string;
      accessType: string;
      userId: string | null;
      reason: string | null;
    };
    
    const where: Record<string, unknown> = {};
    if (documentId && typeof documentId === "string") where.documentId = documentId;

    const events = await findManyAccessEvents<AccessEventRecord>("document_access_events_v2", {
      where,
      orderBy: { column: "createdAt", ascending: false },
      limit: take,
    });

    return {
      ok: true,
      events: (events || []).map((e) => ({
        id: e.id,
        createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date(e.createdAt).toISOString(),
        documentId: e.documentId,
        actorType: e.accessType, // Using accessType from schema
        actorId: e.userId ?? null,
        action: e.accessType,
        reason: e.reason ?? null,
      })),
    };
  });
}

