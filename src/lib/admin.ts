import { getUser, type AppUser } from "@/lib/auth";

/**
 * Check if a user is an admin.
 * Admins are determined by environment variable ADMIN_EMAILS (comma-separated list).
 * If ADMIN_EMAILS is not set, no users are admins.
 * 
 * @param user - Optional user object. If provided, uses this user instead of fetching current user.
 *               This prevents race conditions when checking admin status after fetching the user.
 */
export async function isAdmin(user?: AppUser): Promise<boolean> {
  try {
    // If user is provided, use it; otherwise fetch current user
    const userToCheck = user || await getUser();
    if (!userToCheck) {
      return false;
    }

    // Check by email
    if (userToCheck.email) {
      const email = userToCheck.email.toLowerCase();
      const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
      const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) || [];
      
      const isAdminByEmail = 
        (bootstrapAdminEmail && email === bootstrapAdminEmail) ||
        adminEmails.includes(email);
      
      if (isAdminByEmail) {
        return true;
      }
    }

    // Check by userId (database ID) or clerkId
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(",").map((id) => id.trim()).filter(Boolean) || [];
    
    if (adminUserIds.length > 0 && userToCheck.id && userToCheck.clerkId) {
      const isAdminById = 
        adminUserIds.includes(userToCheck.id) ||
        adminUserIds.includes(userToCheck.clerkId);
      
      if (isAdminById) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Require admin access. Throws an error if user is not an admin.
 * Use this in pages and API routes that require admin privileges.
 * 
 * Checks admin status via ADMIN_EMAILS environment variable.
 * This is the authoritative source for admin access as documented in ADMIN_COMPLIANCE.md.
 * 
 * @throws HttpError(401) if user is not authenticated
 * @throws HttpError(403) if user is not an admin
 */
export async function requireAdmin(): Promise<AppUser> {
  const user = await getUser();
  if (!user) {
    const { HttpError } = await import("./errors");
    throw new HttpError(401, "UNAUTHENTICATED", "Authentication required.");
  }
  
  // Check admin status via ADMIN_EMAILS environment variable
  const adminStatus = await isAdmin(user);
  if (!adminStatus) {
    const { HttpError } = await import("./errors");
    throw new HttpError(403, "FORBIDDEN", "Admin access required.");
  }
  
  return user;
}

