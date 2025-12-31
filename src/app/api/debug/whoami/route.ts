// src/app/api/debug/whoami/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

/**
 * Debug endpoint to check user authentication and database mapping
 * Helps diagnose "admin missing" issues
 * Only available in development mode
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
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
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        role: true,
        roles: true,
      },
    });

    // Check if user is admin (using enum comparison)
    const isAdmin = dbUser?.role === UserRole.ADMIN || dbUser?.roles?.includes("ADMIN") || false;

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
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      {
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

