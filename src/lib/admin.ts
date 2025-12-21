import { getUser, type User } from "@/lib/auth";

/**
 * Check if a user is an admin.
 * Admins are determined by environment variable ADMIN_EMAILS (comma-separated list).
 * If ADMIN_EMAILS is not set, no users are admins.
 * 
 * @param user - Optional user object. If provided, uses this user instead of fetching current user.
 *               This prevents race conditions when checking admin status after fetching the user.
 */
export async function isAdmin(user?: User): Promise<boolean> {
  try {
    // If user is provided, use it; otherwise fetch current user
    const userToCheck = user || await getUser();
    if (!userToCheck) {
      return false;
    }

    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    if (adminEmails.length === 0) {
      return false;
    }

    return adminEmails.includes(userToCheck.email.toLowerCase());
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Require admin access. Throws an error if user is not an admin.
 * Use this in pages and API routes that require admin privileges.
 * 
 * NOTE: This function is now re-exported from @/lib/auth.ts
 * Use requireAdmin() from @/lib/auth.ts instead for consistency.
 * 
 * @deprecated Use requireAdmin() from @/lib/auth.ts
 */
export async function requireAdmin(): Promise<User> {
  // Re-export from auth.ts for backward compatibility
  const { requireAdmin: requireAdminFromAuth } = await import("./auth");
  return requireAdminFromAuth();
}

