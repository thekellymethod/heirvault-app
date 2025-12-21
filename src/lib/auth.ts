import { Role } from "@/lib/roles";

/**
 * Authentication Library
 * 
 * Provides server-only authentication utilities.
 * Stubs integration points (Clerk/Auth.js) behind getSessionUser().
 */

/**
 * User type returned by getUser()
 */
export type User = {
  id: string;
  email: string;
  role: Role;
};

/**
 * Typed errors for route handlers
 */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Internal function to get session user from auth provider.
 * 
 * Stubs integration points (Clerk/Auth.js) here.
 * Replace this implementation when integrating with actual auth provider.
 * 
 * Server-only safe (no window, no client-side hooks).
 */
async function getSessionUser(): Promise<{ id: string; email: string; role: Role } | null> {
  // TODO: Replace with actual auth provider integration
  // Example for Clerk:
  //   const { userId } = await auth();
  //   if (!userId) return null;
  //   const user = await currentUser();
  //   if (!user) return null;
  //   return { id: userId, email: user.emailAddresses[0].emailAddress, role: "ATTORNEY" };
  
  // Example for Auth.js:
  //   const session = await getServerSession();
  //   if (!session?.user) return null;
  //   return { id: session.user.id, email: session.user.email, role: session.user.role };
  
  // Stub implementation: returns null (not authenticated)
  return null;
}

/**
 * Get the current authenticated user.
 * 
 * Returns { id, email, role } or null if not authenticated.
 * 
 * Server-only safe.
 */
export async function getUser(): Promise<User | null> {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return null;
    }

    return {
      id: sessionUser.id,
      email: sessionUser.email,
      role: sessionUser.role,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("getUser: Error fetching session user:", errorMessage);
    return null;
  }
}

/**
 * Require attorney authentication.
 * 
 * Throws UnauthorizedError if not authenticated.
 * Throws ForbiddenError if role is not ATTORNEY or ADMIN.
 * 
 * Can be used in route handlers to return 401/403.
 */
export async function requireAttorney(): Promise<User> {
  const user = await getUser();
  
  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }

  // Allow both ATTORNEY and ADMIN roles
  if (user.role !== "ATTORNEY" && user.role !== "ADMIN") {
    throw new ForbiddenError("Attorney or admin access required");
  }

  return user;
}

/**
 * Require admin authentication.
 * 
 * Throws UnauthorizedError if not authenticated.
 * Throws ForbiddenError if role is not ADMIN.
 * 
 * Can be used in route handlers to return 401/403.
 */
export async function requireAdmin(): Promise<User> {
  const user = await getUser();
  
  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }

  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }

  return user;
}
