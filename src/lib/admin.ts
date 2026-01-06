import { currentUser } from "@clerk/nextjs/server";
import { getUser, type AppUser } from "@/lib/auth";

/**
 * Check if a user is an admin.
 * 
 * Priority order:
 * 1. Clerk publicMetadata.role === "admin" (authoritative source)
 * 2. Database roles array includes "ADMIN"
 * 3. Email in ADMIN_EMAILS env var (backward compatibility)
 * 4. User ID in ADMIN_USER_IDS env var (backward compatibility)
 * 
 * @param user - Optional user object. If provided, uses this user instead of fetching current user.
 *               This prevents race conditions when checking admin status after fetching the user.
 */
export async function isAdmin(user?: AppUser): Promise<boolean> {
  try {
    // First check Clerk public metadata (authoritative source)
    const clerkUser = await currentUser();
    if (clerkUser?.publicMetadata?.role === "admin") {
      return true;
    }

    // If user is provided, use it; otherwise fetch current user
    const userToCheck = user || await getUser();
    if (!userToCheck) {
      return false;
    }

    // Check database roles
    if (userToCheck.roles.includes("ADMIN")) {
      return true;
    }

    // Check by email (backward compatibility)
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

    // Check by userId (database ID) or clerkId (backward compatibility)
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

