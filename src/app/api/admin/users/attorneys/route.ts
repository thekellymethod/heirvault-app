// src/app/api/admin/users/attorneys/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET() {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN]);

    const users = await prisma.user.findMany({
      where: { role: UserRole.attorney },
      orderBy: { id: "asc" },
      take: 500,
      select: { id: true, clerkId: true, role: true, email: true, firstName: true, lastName: true },
    });

    return { ok: true, users };
  });
}

