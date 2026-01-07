// src/lib/permissions/guard.ts
import { auth } from "@clerk/nextjs/server";
;
import { UserRole } from "@/lib/db/enums";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type AppPrincipal = {
  clerkUserId: string;
  dbUserId: string;
  role: UserRole;
  roles: string[]; // Keep for backward compatibility
};

export async function requireAuthPrincipal(): Promise<AppPrincipal> {
  const { userId } = await auth();
  if (!userId) throw new HttpError(401, "Unauthorized");

  // Find user by clerkId (which maps to Clerk userId)
  // Note: Prisma model is "User" but table is "users" (via @@map)
  const dbUser = await prisma.user.findUnique({ 
    where: { clerkId: userId },
    select: { id: true, clerkId: true, role: true, roles: true },
  });

  if (!dbUser) throw new HttpError(403, "User not provisioned");

  // Map UserRole enum to string for roles array compatibility
  const roleStrings = dbUser.roles || [];
  if (dbUser.role === UserRole.ADMIN && !roleStrings.includes("ADMIN")) {
    roleStrings.push("ADMIN");
  }
  if (dbUser.role === UserRole.attorney && !roleStrings.includes("ATTORNEY")) {
    roleStrings.push("ATTORNEY");
  }

  return {
    clerkUserId: userId,
    dbUserId: dbUser.id,
    role: dbUser.role,
    roles: roleStrings,
  };
}

export function requireRole(principal: AppPrincipal, roles: UserRole[]) {
  if (!roles.includes(principal.role)) {
    throw new HttpError(403, "Forbidden");
  }
}

export async function requireClientAccess(params: {
  principal: AppPrincipal;
  clientId: string;
  requireDownload?: boolean;
  requireSensitive?: boolean;
}) {
  // Admins can access everything (you can tighten this later with org boundaries)
  if (params.principal.role === UserRole.ADMIN) return;

  // Attorneys must have explicit access grant
  const grant = await prisma.attorneyClientAccess.findFirst({
    where: {
      attorneyId: params.principal.dbUserId,
      clientId: params.clientId,
      isActive: true,
    },
  });

  if (!grant || !grant.isActive) throw new HttpError(403, "No access to client");

  if (params.requireSensitive && !grant.canViewSensitive) {
    throw new HttpError(403, "No permission for sensitive access");
  }

  if (params.requireDownload && !grant.canDownload) {
    throw new HttpError(403, "No permission to download");
  }
}

