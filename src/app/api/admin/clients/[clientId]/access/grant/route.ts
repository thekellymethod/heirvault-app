// src/app/api/admin/clients/[clientId]/access/grant/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import crypto from "crypto";

export async function POST(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN]);

    const { clientId } = await ctx.params;
    const { userId, canViewSensitive, canDownload } = await req.json().catch(() => ({}));

    if (!userId || typeof userId !== "string") {
      throw new Error("userId required");
    }

    // Check if grant already exists
    const existing = await prisma.attorneyClientAccess.findFirst({
      where: {
        attorneyId: userId,
        clientId,
      },
    });

    if (existing) {
      await prisma.attorneyClientAccess.update({
        where: { id: existing.id },
        data: {
          canViewSensitive: !!canViewSensitive,
          canDownload: !!canDownload,
          isActive: true,
          revokedAt: null,
        },
      });
    } else {
      await prisma.attorneyClientAccess.create({
        data: {
          id: crypto.randomUUID(),
          attorneyId: userId,
          clientId,
          canViewSensitive: !!canViewSensitive,
          canDownload: !!canDownload,
          isActive: true,
        },
      });
    }

    return { ok: true };
  });
}

