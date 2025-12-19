import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

type Role = "attorney";

function normalizeRole(r?: string | null): Role | null {
  if (!r) return null;
  const v = r.toLowerCase();
  if (v === "attorney") return v;
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
  // Use raw SQL to bypass Prisma schema issues
  let existingUser = null;
  try {
    // Try Prisma first
    existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });
    console.log("getCurrentUser - Existing DB role:", existingUser?.role);
  } catch (prismaError: any) {
    console.error("getCurrentUser - Prisma error checking existing user, trying raw SQL:", prismaError.message);
    // Fallback to raw SQL if Prisma fails
    try {
      const rawResult = await prisma.$queryRaw<Array<{ role: string }>>`
        SELECT role FROM users WHERE "clerkId" = ${userId} LIMIT 1
      `;
      if (rawResult && rawResult.length > 0) {
        existingUser = { role: rawResult[0].role };
        console.log("getCurrentUser - Found user via raw SQL, role:", existingUser.role);
      }
    } catch (sqlError: any) {
      console.error("getCurrentUser - Raw SQL also failed:", sqlError.message);
      // Continue without existing user - will create new one
    }
  }

  // All accounts are attorney accounts - default to attorney if not set
  const finalRole: Role = clerkRole ?? (existingUser?.role as Role) ?? "attorney";
  
  console.log("getCurrentUser - Final role to use:", finalRole);

  // Check if email is already used by a different user
  // Skip this check entirely if Prisma is having issues - database constraints will handle conflicts
  let existingUserByEmail = null;
  // Only attempt email check if we successfully got existingUser (Prisma is working)
  if (existingUser) {
    try {
      existingUserByEmail = await prisma.user.findUnique({
        where: { email },
      });
    } catch (prismaError: any) {
      // Silently skip email check if Prisma fails - database unique constraint will handle conflicts
      // Don't log error here to reduce noise - it's expected when Prisma client is out of sync
    }
  }

  // If email exists for a different user, handle the conflict
  // Only process if we successfully got existingUserByEmail (Prisma worked)
  if (existingUserByEmail && existingUserByEmail.clerkId !== userId) {
    // Email is already in use by another Clerk account
    if (existingUser) {
      // User exists by clerkId - update but don't change email
      try {
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
      } catch (updateError: any) {
        console.error("getCurrentUser - Error updating user (email conflict):", updateError.message);
        // Fall through to return minimal user
      }
    } else {
      // User doesn't exist yet, but email is taken by another Clerk account
      // This shouldn't happen normally (Clerk prevents duplicate emails)
      // But if it does, create user with a unique email based on clerkId
      const uniqueEmail = `${userId.replace(/^user_/, '')}@clerk-${Date.now()}.temp`;
      console.warn(`Email ${email} already exists for different Clerk account. Using temporary email: ${uniqueEmail}`);
      try {
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
      } catch (createError: any) {
        console.error("getCurrentUser - Error creating user with temp email:", createError.message);
        // Fall through to return minimal user
      }
    }
    // If Prisma operations failed, return minimal user object to allow access
    console.warn("getCurrentUser - Returning minimal user object due to Prisma errors");
    return {
      id: userId,
      clerkId: userId,
      email,
      firstName,
      lastName,
      role: finalRole,
    };
  }

  // Normal case: email is available or belongs to this user
  if (existingUser) {
    // User exists - update (but skip email if it conflicts)
    try {
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
    } catch (updateError: any) {
      console.error("getCurrentUser - Error updating user:", updateError.message);
      // If update fails due to Prisma issues, return a minimal user object to allow access
      if (updateError.code === 'P2025' || updateError.message.includes('does not exist')) {
        console.log("getCurrentUser - User not found in DB, will create instead");
        // Fall through to create logic
      } else {
        // For other errors, return a basic user object to prevent blocking
        console.warn("getCurrentUser - Returning minimal user object due to Prisma error");
        return {
          id: userId,
          clerkId: userId,
          email,
          firstName,
          lastName,
          role: finalRole,
        };
      }
    }
  }
  
  // User doesn't exist or update failed - create new user
  console.log("getCurrentUser - Creating new user with role:", finalRole);
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
    console.error("getCurrentUser - Prisma create failed, trying raw SQL:", error.message);
    // Try raw SQL insert as fallback
    try {
      const userIdUuid = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO users (id, "clerkId", email, first_name, last_name, role, created_at, updated_at)
        VALUES (${userIdUuid}, ${userId}, ${email}, ${firstName}, ${lastName}, ${finalRole}::"UserRole", NOW(), NOW())
        ON CONFLICT ("clerkId") DO UPDATE 
        SET email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            updated_at = NOW()
      `;
      // Fetch created user with raw SQL
      const rawResult = await prisma.$queryRaw<Array<{ id: string; clerkId: string; email: string; first_name: string | null; last_name: string | null; role: string }>>`
        SELECT id, "clerkId", email, first_name, last_name, role 
        FROM users 
        WHERE "clerkId" = ${userId} 
        LIMIT 1
      `;
      if (rawResult && rawResult.length > 0) {
        const user = rawResult[0];
        console.log("getCurrentUser - Created/updated user via raw SQL");
        return {
          id: user.id,
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role as Role,
        };
      }
    } catch (sqlError: any) {
      console.error("getCurrentUser - Raw SQL create also failed:", sqlError.message);
    }
    
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
        // For Prisma schema/column errors, return a minimal user object to allow access
        // This prevents blocking authentication when Prisma client is out of sync
        if (error.code === 'P2021' || error.code === 'P2025' || error.message.includes('does not exist')) {
          console.error("getCurrentUser - Prisma schema error, returning minimal user object:", error.message);
          console.warn("getCurrentUser - User will be created on next successful Prisma connection");
          return {
            id: userId,
            clerkId: userId,
            email,
            firstName,
            lastName,
            role: finalRole,
          };
        }
        // Re-throw other errors so we can see what's wrong
        console.error("Unexpected error creating user:", error);
        throw error;
      }
    }
}

export async function requireAuth(requiredRole?: Role) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // All accounts are attorney accounts - ensure role is attorney
  if (user.role !== "attorney") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "attorney" },
    });
    user.role = "attorney";
  }

  // If a role is specified, it must be attorney (only role available)
  if (requiredRole && requiredRole !== "attorney") {
    throw new Error("Forbidden");
  }

  return user;
}
