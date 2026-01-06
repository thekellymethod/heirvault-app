// src/app/api/admin/audit/access-events/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
;
import { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN]);

    const { documentId, limit } = await req.json().catch(() => ({}));
    const take = Math.min(Math.max(Number(limit ?? 100), 1), 500);

    const where: {
      documentId?: string;
    } = {};
    if (documentId && typeof documentId === "string") where.documentId = documentId;

    const events = await prisma.document_access_events.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });

    return {
      ok: true,
      events: events.map((e) => ({
        id: e.id,
        createdAt: e.createdAt,
        documentId: e.documentId,
        actorType: e.accessType, // Using accessType from schema
        actorId: e.userId ?? null,
        action: e.accessType,
        reason: e.reason ?? null,
      })),
    };
  });
}

