// src/app/api/debug/admin-diagnostic/route.ts
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateAppUser } from "@/lib/auth/CurrentUser";

/**
 * Comprehensive admin diagnostic endpoint
 * Helps diagnose why admin access isn't working
 * 
 * Available in all environments for troubleshooting
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({
        authenticated: false,
        error: "Not authenticated",
        steps: [
          "1. Sign in to Clerk",
          "2. Check that Clerk session is valid",
        ],
      });
    }

    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
      clerkUser?.emailAddresses?.[0]?.emailAddress ??
      null;

    // Check Clerk metadata
    const publicMetadata = (clerkUser?.publicMetadata || {}) as Record<string, unknown>;
    const clerkRole = (publicMetadata.role || (publicMetadata as Record<string, unknown>)["user.role"] || null) as string | null;
    const isAdminInClerk = clerkRole === "admin";

    // Check environment variables
    const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) || [];
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(",").map((id) => id.trim()).filter(Boolean) || [];

    // Check if email matches admin config
    const emailLower = email?.toLowerCase().trim();
    const isAdminByEmail = emailLower && (
      (bootstrapAdminEmail && emailLower === bootstrapAdminEmail) ||
      adminEmails.includes(emailLower)
    );
    const isAdminById = adminUserIds.includes(clerkUserId);

    // Get database user
    const { findUnique: findUniqueUser } = await import("@/lib/db");
    
    type UserRecord = {
      id: string;
      email: string;
      roles: string[];
      clerkId: string;
    };
    
    const dbUser = await findUniqueUser<UserRecord>("users", { clerkId: clerkUserId });
    const hasAdminInDb = dbUser?.roles?.includes("ADMIN") || false;

    // Try getOrCreateAppUser to see if it would grant admin
    let appUserResult = null;
    try {
      const appUser = await getOrCreateAppUser();
      appUserResult = {
        id: appUser?.id,
        email: appUser?.email,
        roles: appUser?.roles,
        hasAdmin: appUser?.roles?.includes("ADMIN") || false,
      };
    } catch (error) {
      appUserResult = {
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // Determine why admin access might be failing
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!isAdminInClerk) {
      issues.push("Clerk publicMetadata.role is not set to 'admin'");
      recommendations.push("Set Clerk publicMetadata.role to 'admin' in Clerk Dashboard");
      recommendations.push("Or add your email to ADMIN_EMAILS environment variable");
    }

    if (!isAdminByEmail && !isAdminById) {
      issues.push("Email/ID not in admin configuration");
      if (email) {
        recommendations.push(`Add "${email}" to ADMIN_EMAILS or BOOTSTRAP_ADMIN_EMAIL`);
      }
    }

    if (!hasAdminInDb) {
      issues.push("User does not have ADMIN role in database");
      recommendations.push("Sign in again - admin role should be added automatically");
      recommendations.push("Or manually update database: UPDATE users SET roles = array_append(roles, 'ADMIN') WHERE clerk_id = ?");
    }

    if (!dbUser) {
      issues.push("User not found in database");
      recommendations.push("Sign in again - user should be created automatically");
    }

    const isAdmin = isAdminInClerk || hasAdminInDb || isAdminByEmail || isAdminById;

    return NextResponse.json({
      authenticated: true,
      clerkUserId,
      email,
      isAdmin,
      issues,
      recommendations,
      checks: {
        clerkMetadata: {
          publicMetadata,
          role: clerkRole,
          isAdminInClerk,
          note: clerkRole ? `Found role: "${clerkRole}"` : "No role found in publicMetadata",
        },
        environment: {
          bootstrapAdminEmail: bootstrapAdminEmail || "Not set",
          adminEmails: adminEmails.length > 0 ? adminEmails : "Not set",
          adminUserIds: adminUserIds.length > 0 ? adminUserIds : "Not set",
          isAdminByEmail,
          isAdminById,
        },
        database: {
          userFound: !!dbUser,
          userId: dbUser?.id || null,
          email: dbUser?.email || null,
          roles: dbUser?.roles || [],
          hasAdminInDb,
        },
        getOrCreateAppUser: appUserResult,
      },
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
