import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

export const runtime = "nodejs";

/**
 * Debug endpoint to grant admin access to the current user
 * Only works in development mode
 */
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
      clerkUser?.emailAddresses?.[0]?.emailAddress ??
      null;

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const { findUnique: findUniqueUser, update: updateUser } = await import("@/lib/db");
    
    // Get current user
    const dbUser = await findUniqueUser<{ id: string; email: string; roles: string[] }>("users", { clerkId: userId });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    // Add ADMIN role if not already present
    const updatedRoles = dbUser.roles.includes("ADMIN")
      ? dbUser.roles
      : [...new Set([...dbUser.roles, "ADMIN"])];

    const updated = await updateUser("users", { id: dbUser.id }, {
      roles: updatedRoles,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>) as { id: string; email: string; roles: string[] };

    return NextResponse.json({
      success: true,
      message: "Admin role granted",
      user: {
        id: updated.id,
        email: updated.email,
        roles: updated.roles,
        hasAdmin: updated.roles.includes("ADMIN"),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
}

