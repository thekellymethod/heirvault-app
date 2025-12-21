import { getCurrentUser } from "@/lib/utils/clerk";

/**
 * Check if the current user is an admin.
 * Admins are determined by environment variable ADMIN_EMAILS (comma-separated list).
 * If ADMIN_EMAILS is not set, no users are admins.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return false;
    }

    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    if (adminEmails.length === 0) {
      return false;
    }

    return adminEmails.includes(user.email.toLowerCase());
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Require admin access. Throws an error if user is not an admin.
 * Use this in pages and API routes that require admin privileges.
 */
export async function requireAdmin(): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const admin = await isAdmin();
  if (!admin) {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

