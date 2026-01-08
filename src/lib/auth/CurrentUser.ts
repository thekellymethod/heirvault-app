import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
// Prisma removed - database access needs to be implemented

export type AppUser = {
  id: string,
  clerkId: string,
  email: string,
  roles: string[];
};

// Local HttpError class to avoid circular dependency with guards.ts
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getOrCreateAppUser(): Promise<AppUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const cu = await currentUser();
  const emailRaw =
    cu?.emailAddresses?.find(e => e.id === cu.primaryEmailAddressId)?.emailAddress ??
    cu?.emailAddresses?.[0]?.emailAddress ??
    null;

  if (!emailRaw) throw new Error("No email found for Clerk user.");

  // Normalize email to lowercase for consistent matching across OAuth providers
  // Apple, Google, and Microsoft may provide emails in different cases
  const email = emailRaw.toLowerCase().trim();

  // Check if this is an admin (by email, userId, or clerkId)
  const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase().trim();
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) || [];
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(",").map((id) => id.trim()).filter(Boolean) || [];
  
  const isAdminByEmail = 
    (bootstrapAdminEmail && email === bootstrapAdminEmail) ||
    adminEmails.includes(email);
  
  const isAdminById = adminUserIds.length > 0 && (
    adminUserIds.includes(userId) // Check by Clerk ID
  );
  
  const isAdmin = isAdminByEmail || isAdminById;

  // Determine initial roles
  const initialRoles = isAdmin ? ["USER", "ADMIN"] : ["USER"];

  // First, check if user exists by Clerk ID
  const { findUnique: findUniqueUser, update: updateUser, create: createUser } = await import("@/lib/db");
  const { getDb } = await import("@/lib/db");
  
  type UserRecord = {
    id: string;
    roles: string[];
    email: string;
    clerkId: string;
  };
  
  let existingUser = await findUniqueUser<UserRecord>("users", { clerkId: userId });

  // If not found by Clerk ID, check if user exists by email (from pending application)
  // This links accounts when someone applies before signing in
  // Note: Email matching is case-insensitive - we normalize to lowercase
  if (!existingUser) {
    // Use case-insensitive email lookup via Supabase query
    const db = getDb();
    const { data: userByEmailResult } = await db
      .from("users")
      .select("id")
      .ilike("email", email)
      .limit(1);

    const userByEmail = userByEmailResult && userByEmailResult.length > 0 
      ? await findUniqueUser<UserRecord>("users", { id: userByEmailResult[0].id as string })
      : null;

    if (userByEmail) {
      // Check if the existing user has a placeholder clerkId (pending_*)
      const hasPlaceholder = userByEmail.clerkId?.startsWith("pending_");
      
      if (hasPlaceholder) {
        // Link the Clerk account to the existing user account
        // Update clerkId from placeholder (pending_*) to actual Clerk ID
        // Also normalize email to lowercase for consistency
        existingUser = await updateUser("users", { id: userByEmail.id }, {
          clerkId: userId, // Link Clerk account
          email: email, // Normalize email to lowercase
          updatedAt: new Date().toISOString(),
        } as Record<string, unknown>) as UserRecord;
        console.log(`[AUDIT] Linked Clerk account (${userId}) to existing user by email: ${email} (OAuth provider: ${cu?.externalAccounts?.[0]?.provider || 'unknown'})`);
      } else {
        // SECURITY: User exists with a different (non-placeholder) clerkId
        // This indicates the email is already associated with a different Clerk account
        // For a legal application handling sensitive estate data, we should NOT automatically
        // link accounts to prevent account takeover attacks
        // 
        // We throw an HttpError here instead of trying to create a new user, because:
        // 1. Creating a new user with the same email would violate the unique constraint
        // 2. Users should use their original sign-in method or contact support
        const attemptedProvider = cu?.externalAccounts?.[0]?.provider || 'unknown';
        const originalProvider = userByEmail.clerkId.startsWith("pending_") 
          ? "pending application" 
          : "a different sign-in method";
        
        console.error(`[SECURITY] Account linking blocked: User with email ${email} already has a different Clerk account (${userByEmail.clerkId}). Attempted sign-in with Clerk ID: ${userId} (OAuth provider: ${attemptedProvider})`);
        
        // Throw an HttpError that will be properly handled by Next.js error boundaries
        throw new HttpError(
          409, // Conflict - email already associated with different account
          `This email address is already associated with an account created via ${originalProvider}. ` +
          `Please sign in using your original sign-in method (not ${attemptedProvider}). ` +
          `If you need to link accounts, please contact support.`
        );
      }
    }
  }

  let dbUser: AppUser;

  if (existingUser) {
    // Update existing user - ensure ADMIN role is added if email matches admin list
    let updatedRoles = existingUser.roles;
    if (isAdmin && !existingUser.roles.includes("ADMIN")) {
      updatedRoles = [...new Set([...existingUser.roles, "ADMIN"])];
      console.log(`[AUDIT] Adding ADMIN role to existing user: ${email} (was: ${existingUser.roles.join(", ")})`);
    } else if (!isAdmin && existingUser.roles.includes("ADMIN")) {
      // Remove ADMIN role if email no longer matches admin list
      updatedRoles = existingUser.roles.filter((r) => r !== "ADMIN");
      console.log(`[AUDIT] Removing ADMIN role from user: ${email} (email no longer in admin list)`);
    }

    dbUser = await updateUser("users", { id: existingUser.id }, {
      email,
      roles: updatedRoles,
      clerkId: userId, // Ensure clerkId is updated (in case it was a placeholder)
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>) as UserRecord;

    // Log admin bootstrap if admin was just added
    if (isAdmin && !existingUser.roles.includes("ADMIN") && dbUser.roles.includes("ADMIN")) {
      console.log(`[AUDIT] Admin user bootstrapped: ${email}`);
    }
  } else {
    // Create new user
    const { randomUUID } = await import("crypto");
    const newUserId = randomUUID();
    
    // Ensure id is explicitly set as a string UUID
    // Make sure all required fields are present
    // Note: createdAt and updatedAt are auto-generated by the database, don't include them
    const userData: Record<string, unknown> = {
      id: newUserId,
      clerkId: userId,
      email,
      roles: initialRoles,
    };
    
    // Log before create to verify id is present
    console.log(`[AUDIT] Creating new user - id: ${userData.id}, clerkId: ${userData.clerkId}, email: ${userData.email}`);
    
    try {
      await createUser("users", userData);
      dbUser = await findUniqueUser<UserRecord>("users", { id: newUserId }) as UserRecord;
    } catch (createError) {
      console.error(`[ERROR] Failed to create user:`, createError);
      console.error(`[ERROR] User data was:`, JSON.stringify(userData, null, 2));
      throw createError;
    }

    // Log admin bootstrap if this is a new admin user
    if (isAdmin) {
      console.log(`[AUDIT] Admin user bootstrapped: ${email}`);
    }
  }

  return dbUser;
}
