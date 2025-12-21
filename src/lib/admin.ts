import { getCurrentUser } from "@/lib/utils/clerk";

type User = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

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
    const userToCheck = user || await getCurrentUser();
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
 * This function fetches the current user once and passes it to isAdmin() to prevent
 * race conditions where authentication state could change between calls.
 */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Pass the already-fetched user to isAdmin() to prevent race conditions
  const admin = await isAdmin(user);
  if (!admin) {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

