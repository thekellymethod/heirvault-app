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
  role: string; // User role as string (e.g., "attorney", "admin")
  roles: string[]; // Keep for backward compatibility
};

type UserRecord = {
  id: string;
  clerkId: string;
  role: string;
  roles?: string[] | null;
};

export async function requireAuthPrincipal(): Promise<AppPrincipal> {
  const { userId } = await auth();
  if (!userId) throw new HttpError(401, "Unauthorized");

  // Find user by clerkId (which maps to Clerk userId)
  const { findUnique } = await import("@/lib/db");
  const dbUser = await findUnique<UserRecord>("users", { clerkId: userId });

  if (!dbUser) throw new HttpError(403, "User not provisioned");

  // Map role to string for roles array compatibility
  const roleStrings = dbUser.roles || [];
  // Check if role is "admin" (case-insensitive) and add ADMIN to roles array
  if (dbUser.role?.toLowerCase() === "admin" && !roleStrings.includes("ADMIN")) {
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

export function requireRole(principal: AppPrincipal, roles: string[]) {
  if (!roles.includes(principal.role)) {
    throw new HttpError(403, "Forbidden");
  }
}

type AttorneyClientAccessRecord = {
  id: string;
  attorneyId: string;
  clientId: string;
  isActive: boolean;
  canViewSensitive?: boolean;
  canDownload?: boolean;
};

export async function requireClientAccess(params: {
  principal: AppPrincipal;
  clientId: string;
  requireDownload?: boolean;
  requireSensitive?: boolean;
}) {
  // Admins can access everything (you can tighten this later with org boundaries)
  // Check roles array for ADMIN (admin is determined by roles array, not UserRole enum)
  if (params.principal.roles.includes("ADMIN")) return;

  // Attorneys must have explicit access grant
  const { findMany } = await import("@/lib/db");
  const grants = await findMany<AttorneyClientAccessRecord>("attorney_client_access", {
    where: {
      attorneyId: params.principal.dbUserId,
      clientId: params.clientId,
      isActive: true,
    },
    limit: 1,
  });

  const grant = grants && grants.length > 0 ? grants[0] : null;

  if (!grant || !grant.isActive) throw new HttpError(403, "No access to client");

  if (params.requireSensitive && !grant.canViewSensitive) {
    throw new HttpError(403, "No permission for sensitive access");
  }

  if (params.requireDownload && !grant.canDownload) {
    throw new HttpError(403, "No permission to download");
  }
}

