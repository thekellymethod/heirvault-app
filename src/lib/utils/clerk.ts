import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

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

    // Upsert user using Prisma
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        email,
        firstName,
        lastName,
        role,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        clerkId: userId,
        email,
        firstName,
        lastName,
        role,
      },
    });

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
        log("No nested cause found - error details unavailable");
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
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "attorney", updatedAt: new Date() },
      });
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
