import "server-only";
import { currentUser } from "@clerk/nextjs/server";
;
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

/**
 * Require admin access. Checks Clerk public metadata first (authoritative),
 * then falls back to database roles and ADMIN_EMAILS env var for backward compatibility.
 * 
 * Primary source: Clerk publicMetadata.role === "admin"
 * Fallback: Database roles array includes "ADMIN" OR email in ADMIN_EMAILS
 * 
 * @throws HttpError(401) if user is not authenticated
 * @throws HttpError(403) if user is not an admin
 */
export async function requireAdmin() {
  // First check Clerk public metadata (authoritative source)
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new HttpError(401, "Not authenticated.");
  }

  // Check Clerk public metadata first (primary source of truth)
  // Handle both "role" and "user.role" formats for backward compatibility
  const publicMetadata = (clerkUser.publicMetadata || {}) as Record<string, unknown>;
  const clerkRole = (publicMetadata.role || (publicMetadata as Record<string, unknown>)["user.role"] || null) as string | null;
  const isAdminInClerk = clerkRole === "admin";
  
  if (isAdminInClerk) {
    // User is admin via Clerk metadata - return the database user
    const user = await requireAuth();
    return user;
  }

  // Fallback: Check database roles and ADMIN_EMAILS (backward compatibility)
  const user = await requireAuth();
  
  // Check if user has ADMIN role in database
  if (user.roles.includes("ADMIN")) {
    return user;
  }

  // Check if email is in ADMIN_EMAILS env var (backward compatibility)
  if (user.email) {
    const email = user.email.toLowerCase();
    const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) || [];
    
    const isAdminByEmail = 
      (bootstrapAdminEmail && email === bootstrapAdminEmail) ||
      adminEmails.includes(email);
    
    if (isAdminByEmail) {
      return user;
    }
  }

  // Not an admin via any method
  throw new HttpError(403, "Admin access required.");
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
  type AttorneyProfileRecord = {
    licenseStatus?: string;
    license_status?: string;
    verifiedAt?: string | Date | null;
    verified_at?: string | Date | null;
    userId?: string;
    user_id?: string;
  };

  const { findMany } = await import("@/lib/db");
  const attorneyResults = await findMany<AttorneyProfileRecord>("attorney_profiles", {
    where: { userId: user.id },
    limit: 1,
  });
  
  const attorneyRow = attorneyResults && attorneyResults.length > 0 ? attorneyResults[0] : null;
  const attorney = attorneyRow ? {
    licenseStatus: attorneyRow.licenseStatus || attorneyRow.license_status || '',
    verifiedAt: attorneyRow.verifiedAt || attorneyRow.verified_at || null,
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