import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db, users, eq, prisma } from "@/lib/db";
import { randomUUID } from "crypto";

type Role = "attorney";

type DbUser = {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role | string;
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
    const { userId } = await auth();
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

    // One deterministic DB write using raw SQL to avoid schema/column mismatches
    // - Insert if missing
    // - Update if exists (by clerkId)
    //
    // Using raw SQL because the database table may not have all columns defined in the Drizzle schema
    // The initial migration only created: id, clerkId, email, first_name, last_name, role, created_at, updated_at
    const result = await prisma.$queryRawUnsafe<Array<{
      id: string;
      clerkId: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      role: string;
      bar_number: string | null;
    }>>(`
      INSERT INTO "users" ("id", "clerkId", "email", "first_name", "last_name", "role", "updated_at")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT ("clerkId") 
      DO UPDATE SET 
        "email" = $3,
        "first_name" = $4,
        "last_name" = $5,
        "role" = $6,
        "updated_at" = $7
      RETURNING "id", "clerkId", "email", "first_name", "last_name", "role", "bar_number"
    `,
      randomUUID(),
      userId,
      email,
      firstName,
      lastName,
      role,
      new Date()
    );

    const row = result[0];
    if (!row) return null;

    return {
      id: row.id,
      clerkId: row.clerkId,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role as Role,
      barNumber: row.bar_number,
    };
  } catch (error: unknown) {
    // Minimal, safe error logging that won't throw
    try {
      // Extract error info safely
      let errName: string | undefined;
      let errMessage: string | undefined;
      let errStack: string | undefined;
      let cause: Record<string, unknown> | undefined;

      if (error && typeof error === "object") {
        const err = error as Record<string, unknown>;
        errName = typeof err.name === "string" ? err.name : undefined;
        errMessage = typeof err.message === "string" ? err.message : undefined;
        errStack = typeof err.stack === "string" ? err.stack : undefined;

        // Try to find nested cause
        cause =
          (err.cause as Record<string, unknown> | undefined) ??
          (err.error as Record<string, unknown> | undefined) ??
          (err.originalError as Record<string, unknown> | undefined) ??
          (err.original as Record<string, unknown> | undefined) ??
          (err.driverError as Record<string, unknown> | undefined) ??
          (err.clientError as Record<string, unknown> | undefined);
      }

      // Log using both stderr and console.error for maximum visibility
      const log = (msg: string) => {
        try {
          process.stderr.write(msg + "\n");
        } catch {
          // Fallback if stderr fails
        }
        try {
          // Also use console.error as fallback - it might work in some environments
          if (typeof console !== "undefined" && console.error) {
            console.error(msg);
          }
        } catch {
          // Ignore if console.error fails
        }
      };

      log("==================================================================================");
      log("getCurrentUser: DATABASE ERROR DETECTED");
      log("==================================================================================");
      log(`Error name: ${errName ?? "unknown"}`);
      log(`Error message: ${errMessage ?? "unknown"}`);
      if (errStack) {
        log(`Stack: ${errStack.substring(0, 500)}`);
      }

      if (cause) {
        log("==================================================================================");
        log("DB CAUSE (THE REAL POSTGRES ERROR):");
        log("==================================================================================");
        log(`  name: ${typeof cause.name === "string" ? cause.name : "N/A"}`);
        log(`  message: ${typeof cause.message === "string" ? cause.message : "N/A"}`);
        log(`  code: ${cause.code ?? "N/A"}`);
        log(`  detail: ${cause.detail ?? "N/A"}`);
        log(`  hint: ${cause.hint ?? "N/A"}`);
        log(`  constraint: ${cause.constraint ?? "N/A"}`);
        log(`  table: ${cause.table ?? "N/A"}`);
        log(`  column: ${cause.column ?? "N/A"}`);
        log(`  schema: ${cause.schema ?? "N/A"}`);
        log(`  routine: ${cause.routine ?? "N/A"}`);
      } else {
        log("==================================================================================");
        log("No nested cause found - error may be wrapped by Drizzle");
        log("==================================================================================");
      }
    } catch {
      // If even error logging fails, just return null silently
    }

    return null;
  }
}

/**
 * Require authentication for server components/pages.
 * Returns the authenticated attorney user or throws an Error("Unauthorized").
 */
export async function requireAuth(): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>> {
  const user = await getCurrentUser();
  if (!user) throw new Error(UNAUTHORIZED_ERROR);

  // Enforce attorney role
  if (user.role !== "attorney") {
    try {
      await db
        .update(users)
        .set({ role: "attorney", updatedAt: new Date() })
        .where(eq(users.id, user.id));
      user.role = "attorney";
    } catch (error: unknown) {
      console.error("requireAuth: Error forcing attorney role:", error);
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
