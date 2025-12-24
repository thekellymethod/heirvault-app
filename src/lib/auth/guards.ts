import "server-only";
import { prisma } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/auth/CurrentUser";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireAuth() {
  const user = await getOrCreateAppUser();
  if (!user) throw new HttpError(401, "Not authenticated.");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  
  if (!user.roles.includes("ADMIN")) {
    throw new HttpError(403, "Admin access required.");
  }
  
  return user;
}

export async function requireVerifiedAttorney() {
  const user = await requireAuth();

  // Admin bypass (admin can access attorney pages even without AttorneyProfile)
  if (user.roles.includes("ADMIN")) {
    return user;
  }

  // Non-admin must have ATTORNEY role
  if (!user.roles.includes("ATTORNEY")) {
    // Provide helpful error message with link to apply
    const error = new HttpError(403, "Attorney access required. Please apply to become an attorney.") as HttpError & { redirectTo?: string };
    error.redirectTo = "/attorney/apply";
    throw error;
  }

  // Check attorney profile verification
  const attorneyResult = await prisma.$queryRawUnsafe<Array<{
    license_status: string;
    verified_at: Date | null;
  }>>(
    `SELECT license_status, verified_at FROM attorney_profiles WHERE user_id = $1 LIMIT 1`,
    user.id
  );
  
  const attorney = attorneyResult && attorneyResult.length > 0 ? {
    licenseStatus: attorneyResult[0].license_status,
    verifiedAt: attorneyResult[0].verified_at,
  } : null;

  if (!attorney?.verifiedAt || attorney.licenseStatus !== "ACTIVE") {
    // Check if they have a pending application
    if (attorney && attorney.licenseStatus === "PENDING") {
      const error = new HttpError(403, "Your attorney application is pending verification. An administrator will review it shortly.") as HttpError & { redirectTo?: string };
      error.redirectTo = "/attorney/apply?pending=true";
      throw error;
    }
    // No application yet
    const error = new HttpError(403, "Attorney verification required. Please submit an application.") as HttpError & { redirectTo?: string };
    error.redirectTo = "/attorney/apply";
    throw error;
  }

  return user;
}

export async function requireVerifiedAttorneyWithClerkId() {
  const user = await requireVerifiedAttorney();
  // user.clerkId exists from AppUser
  return user; // { id, clerkId, email, roles }
}