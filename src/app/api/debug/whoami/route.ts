// src/app/api/debug/whoami/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
;
import { UserRole } from "@/lib/db/enums";

/**
 * Debug endpoint to check user authentication and database mapping
 * Helps diagnose "admin missing" issues
 * 
 * In development: Available to all authenticated users
 * In production: Admin-only (useful for troubleshooting)
 */
export async function GET() {
  // In production, require admin access
  if (process.env.NODE_ENV === "production") {
    const { isAdmin } = await import("@/lib/admin");
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
  }

  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({
        authenticated: false,
        clerkUserId: null,
        error: "Not authenticated",
      });
    }

    // Try to find user in database
    const { findUnique: findUniqueUser } = await import("@/lib/db");
    
    type UserRecord = {
      id: string;
      clerkId: string;
      email: string;
      role: string;
      roles: string[];
    };
    
    const dbUser = await findUniqueUser<UserRecord>("users", { clerkId: clerkUserId });

    // Check if user is admin (using roles array)
    const isAdmin = dbUser?.roles?.includes("ADMIN") || false;

    return NextResponse.json({
      authenticated: true,
      clerkUserId,
      email: dbUser?.email || null,
      dbUserFound: !!dbUser,
      dbUserId: dbUser?.id || null,
      role: dbUser?.role || null,
      roles: dbUser?.roles || [],
      isAdmin,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json(
      {
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

