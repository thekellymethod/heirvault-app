// src/app/api/admin/users/attorneys/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { UserRole } from "@/lib/db/enums";

export async function GET() {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.attorney]); // Note: UserRole only has 'attorney', not 'ADMIN'

    const { findMany: findManyUsers } = await import("@/lib/db");
    
    type UserRecord = {
      id: string;
      clerkId: string;
      role: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
    
    const users = await findManyUsers<UserRecord>("users", {
      where: { role: UserRole.attorney },
      orderBy: { column: "id", ascending: true },
      limit: 500,
    });

    return { ok: true, users: users || [] };
  });
}

