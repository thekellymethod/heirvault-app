import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateAppUser } from "@/lib/auth/CurrentUser";

export const runtime = "nodejs";

/**
 * Debug endpoint to check user roles and admin configuration
 * Used by admin sign-in flow
 * 
 * In development: Available to all authenticated users
 * In production: Admin-only (used by admin sign-in)
 */
export async function GET() {
  // In production, require admin access (this endpoint is used by admin sign-in)
  if (process.env.NODE_ENV === "production") {
    const { isAdmin } = await import("@/lib/admin");
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
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

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, email: true, roles: true },
    });

    // Check admin email config
    const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@heirvault.app";
    const shouldBeAdmin = email?.toLowerCase() === bootstrapAdminEmail.toLowerCase();

    return NextResponse.json({
      clerkId: userId,
      clerkEmail: email,
      dbUser: dbUser
        ? {
            id: dbUser.id,
            email: dbUser.email,
            roles: dbUser.roles,
            hasAdmin: dbUser.roles.includes("ADMIN"),
          }
        : null,
      config: {
        bootstrapAdminEmail,
        shouldBeAdmin,
        envSet: !!process.env.BOOTSTRAP_ADMIN_EMAIL,
      },
      getOrCreateAppUser: await getOrCreateAppUser().then((u) => ({
        id: u?.id,
        email: u?.email,
        roles: u?.roles,
        hasAdmin: u?.roles.includes("ADMIN"),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
}

