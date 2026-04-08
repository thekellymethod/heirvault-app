import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { describeError } from "@/lib/auth/guards";

type Role = "attorney";

type DbUser = {
  id: string,
  clerkId: string,
  email: string,
  firstName: string | null;
  lastName: string | null;
  role: Role | string,
  barNumber: string | null;
};

const UNAUTHORIZED_ERROR = "Unauthorized";

/**
 * Get the current authenticated user from the database.
 * - All authenticated users are treated as attorneys.
 * - Creates or updates the user record as needed (UPSERT).
 * - Returns null if unauthenticated or if the DB operation fails.
 */
export async function getCurrentUser(): Promise<DbUser | null> {
  try {
    // First check if user is authenticated via Clerk
    // During build/prerender, auth() may fail - catch and return null
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (_authError: unknown) {
      // During build/prerender, auth() fails - return null silently
      // This prevents "DATABASE ERROR DETECTED" spam during static generation
      return null;
    }

    if (!userId) {
      // Not authenticated - return null (don't try to create user)
      return null;
    }

    // Get full user object from Clerk
    const cu = await currentUser();
    if (!cu) {
      // Clerk session exists but user object not available - return null
      return null;
    }

    const email = cu.emailAddresses?.[0]?.emailAddress ?? null;
    const firstName = cu.firstName ?? null;
    const lastName = cu.lastName ?? null;

    if (!email) {
      console.warn("getCurrentUser: No email found for clerk userId:", userId);
      return null;
    }

    const role: Role = "attorney";

    // Upsert user using Supabase
    const { findUnique, create, update } = await import("@/lib/db");
    
    // Try to find existing user
    let user = await findUnique<DbUser>("users", { clerkId: userId });
    
    if (user) {
      // Update existing user
      user = await update<DbUser>(
        "users",
        { clerkId: userId },
        {
          email,
          firstName,
          lastName,
          role,
        } as any
      );
    } else {
      // Create new user
      const crypto = await import("crypto");
      user = await create<DbUser>("users", {
        id: crypto.randomUUID(),
        clerkId: userId,
        email,
        firstName,
        lastName,
        role,
        barNumber: null,
      } as any);
    }

    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as Role,
      barNumber: user.barNumber,
    };
  } catch (error: unknown) {
    // One structured warn — avoids Next.js dev overlay treating each console.error line as a separate error
    try {
      if (process.env.NODE_ENV === "development") {
        console.warn("[getCurrentUser] DB error, returning null:", describeError(error));
      }
    } catch {
      // ignore logging failures
    }

    return null;
  }
}

/**
 * Require authentication for server components/pages.
 * Returns the authenticated attorney user or throws an Error("Unauthorized").
 * 
 * IMPORTANT: This function only checks Clerk authentication, not database presence.
 * Database errors (schema mismatches, missing rows) should NOT result in "Unauthorized".
 * They should be handled separately as profile provisioning issues.
 */
export async function requireAuth(): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>> {
  // First check Clerk authentication (this is the source of truth for auth)
  const { userId } = await auth();
  if (!userId) {
    throw new Error(UNAUTHORIZED_ERROR);
  }

  // Try to get user from database, but don't throw Unauthorized on DB errors
  const user = await getCurrentUser();
  
  // If user doesn't exist in DB, that's a provisioning issue, not an auth issue
  // But for now, we'll still throw to maintain backward compatibility
  // TODO: Consider returning a partial user object or redirecting to onboarding
  if (!user) {
    console.error("requireAuth: User authenticated via Clerk but not found in database. This may be a schema mismatch or provisioning issue.");
    throw new Error(UNAUTHORIZED_ERROR);
  }

  // Enforce attorney role
  if (user.role !== "attorney") {
    try {
      const { update: dbUpdate } = await import("@/lib/db");
      const updated = await dbUpdate(
        "users",
        { id: user.id },
        { role: "attorney", updatedAt: new Date().toISOString() }
      );
      user.role = updated.role as Role;
    } catch (error: unknown) {
      // Don't throw on DB errors - just log and continue with default role
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("requireAuth: Error forcing attorney role (non-fatal):", errorMessage);
      // Check if it's a schema error
      if (errorMessage.includes("column") || errorMessage.includes("schema cache") || errorMessage.includes("Could not find")) {
        console.error("requireAuth: This appears to be a schema mismatch error. Check that column names match (snake_case vs camelCase).");
      }
      user.role = "attorney";
    }
  }

  return user;
}

/**
 * Require authentication for API routes.
 * Returns { user } or { response: 401 }.
 */
export async function requireAuthApi(): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; response?: never }
  | { user?: never; response: NextResponse }
> {
  try {
    const user = await requireAuth();
    return { user };
  } catch {
    return {
      response: NextResponse.json({ error: UNAUTHORIZED_ERROR }, { status: 401 }),
    };
  }
}
