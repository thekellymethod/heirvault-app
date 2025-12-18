import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type Role = "attorney" | "client" | "admin";

function normalizeRole(r?: string | null): Role | null {
  if (!r) return null;
  const v = r.toLowerCase();
  if (v === "attorney" || v === "client" || v === "admin") return v;
  return null;
}

export async function getCurrentUser() {
  const { userId } = await auth();
  console.log("getCurrentUser - Step 1: userId from auth():", userId);
  if (!userId) {
    console.log("getCurrentUser - No userId, returning null");
    return null;
  }

  const cu = await currentUser();
  console.log("getCurrentUser - Step 2: currentUser() result:", cu ? "exists" : "null", cu?.emailAddresses?.[0]?.emailAddress);
  if (!cu) {
    console.log("getCurrentUser - No currentUser, returning null");
    return null;
  }

  const email = cu.emailAddresses?.[0]?.emailAddress ?? null;
  const firstName = cu.firstName ?? null;
  const lastName = cu.lastName ?? null;

  console.log("getCurrentUser - Step 3: email:", email, "firstName:", firstName, "lastName:", lastName);
  if (!email) {
    console.log("getCurrentUser - No email found, returning null");
    return null;
  }

  // If you store role in Clerk public metadata: cu.publicMetadata.role
  // Otherwise this will keep DB role as source of truth.
  const clerkRole = normalizeRole((cu.publicMetadata as any)?.role ?? null);
  
  console.log("getCurrentUser - Clerk role:", clerkRole, "Raw metadata:", (cu.publicMetadata as any)?.role);

  // Check existing user in database first to preserve their role
  const existingUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });
  
  console.log("getCurrentUser - Existing DB role:", existingUser?.role);

  // Use Clerk role if available (it takes precedence), otherwise keep existing DB role, otherwise default to client
  const finalRole = clerkRole ?? (existingUser?.role as Role) ?? "client";
  
  console.log("getCurrentUser - Final role to use:", finalRole);

  // Check if email is already used by a different user
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email },
  });

  // If email exists for a different user, handle the conflict
  if (existingUserByEmail && existingUserByEmail.clerkId !== userId) {
    // Email is already in use by another Clerk account
    if (existingUser) {
      // User exists by clerkId - update but don't change email
      const dbUser = await prisma.user.update({
        where: { clerkId: userId },
        data: {
          firstName,
          lastName,
          role: finalRole,
          // Don't update email - it belongs to another account
        },
        select: {
          id: true,
          clerkId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });
      return dbUser;
    } else {
      // User doesn't exist yet, but email is taken by another Clerk account
      // This shouldn't happen normally (Clerk prevents duplicate emails)
      // But if it does, create user with a unique email based on clerkId
      const uniqueEmail = `${userId.replace(/^user_/, '')}@clerk-${Date.now()}.temp`;
      console.warn(`Email ${email} already exists for different Clerk account. Using temporary email: ${uniqueEmail}`);
      const dbUser = await prisma.user.create({
        data: {
          clerkId: userId,
          email: uniqueEmail,
          firstName,
          lastName,
          role: finalRole,
        },
        select: {
          id: true,
          clerkId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });
      return dbUser;
    }
  }

  // Normal case: email is available or belongs to this user
  if (existingUser) {
    // User exists - update (but skip email if it conflicts)
    const dbUser = await prisma.user.update({
      where: { clerkId: userId },
      data: {
        email,
        firstName,
        lastName,
        role: finalRole,
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });
    console.log("getCurrentUser - Updated existing user:", dbUser.id, dbUser.role);
    return dbUser;
  } else {
    // User doesn't exist - create new user
    console.log("getCurrentUser - Creating new user with role:", finalRole);
    // Use try-catch to handle race conditions where email might be taken between check and create
    try {
      const dbUser = await prisma.user.create({
        data: {
          clerkId: userId,
          email,
          firstName,
          lastName,
          role: finalRole,
        },
        select: {
          id: true,
          clerkId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });
      console.log("getCurrentUser - Created new user:", dbUser.id, dbUser.role);
      return dbUser;
    } catch (error: any) {
      console.error("Create user error in getCurrentUser:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      // Handle unique constraint violation on email
      const isEmailConstraintError = 
        error?.code === 'P2002' && 
        (error?.meta?.target?.includes('email') || 
         error?.meta?.target_name === 'users_email_key' ||
         error?.message?.includes('email'));
      
      if (isEmailConstraintError) {
        console.log("Email constraint violation during create in getCurrentUser, email was taken by another user");
        // Email was taken between our check and create - try to find the existing user
        const existingByEmail = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            clerkId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        });
        if (existingByEmail) {
          console.log("Found existing user by email, returning it");
          return existingByEmail;
        }
        // If we can't find it, create with temporary email
        const uniqueEmail = `${userId.replace(/^user_/, '')}@clerk-${Date.now()}.temp`;
        console.warn(`Using temporary email: ${uniqueEmail}`);
        const dbUser = await prisma.user.create({
          data: {
            clerkId: userId,
            email: uniqueEmail,
            firstName,
            lastName,
            role: finalRole,
          },
          select: {
            id: true,
            clerkId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        });
        return dbUser;
      } else {
        // Re-throw other errors so we can see what's wrong
        console.error("Unexpected error creating user:", error);
        throw error;
      }
    }
  }
}

export async function requireAuth(requiredRole?: Role) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  if (requiredRole) {
    // Check Clerk metadata first (it takes precedence)
    const cu = await currentUser();
    const clerkRoleRaw = (cu?.publicMetadata as any)?.role;
    const clerkRoleNormalized = clerkRoleRaw?.toLowerCase?.();
    
    // Normalize Clerk role - handle all three roles
    let clerkRole: Role | null = null;
    if (clerkRoleNormalized === "attorney" || clerkRoleNormalized === "admin" || clerkRoleNormalized === "client") {
      clerkRole = clerkRoleNormalized as Role;
    }
    
    // Determine the actual role (Clerk metadata takes precedence, then DB)
    const actualRole: Role | null = clerkRole || user.role || null;
    
    // Check if the actual role matches the required role
    if (actualRole !== requiredRole) {
      throw new Error("Forbidden");
    }
    
    // If Clerk has a role but DB doesn't match, sync it
    if (clerkRole && user.role !== clerkRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: clerkRole },
      });
      // Update the user object for this request
      user.role = clerkRole;
    }
  }

  return user;
}
