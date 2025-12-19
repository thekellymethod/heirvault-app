import { auth, currentUser } from "@clerk/nextjs/server";
import { db, users, eq, sql } from "@/lib/db";
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
  let existingUser = null;
  try {
    const result = await db.select({ role: users.role })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);
    
    if (result && result.length > 0) {
      existingUser = { role: result[0].role };
      console.log("getCurrentUser - Existing DB role:", existingUser.role);
    }
  } catch (error: any) {
    console.error("getCurrentUser - Error checking existing user:", error.message);
    // Continue without existing user - will create new one
  }

  // All accounts are attorney accounts - default to attorney if not set
  const finalRole: Role = clerkRole ?? (existingUser?.role as Role) ?? "attorney";
  
  console.log("getCurrentUser - Final role to use:", finalRole);

  // Check if email is already used by a different user
  let existingUserByEmail = null;
  if (existingUser) {
    try {
      const result = await db.select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (result && result.length > 0) {
        existingUserByEmail = result[0];
      }
    } catch (error: any) {
      // Silently skip email check if it fails - database unique constraint will handle conflicts
      console.error("getCurrentUser - Error checking email:", error.message);
    }
  }

  // If email exists for a different user, handle the conflict
  // Only process if we successfully got existingUserByEmail (Prisma worked)
  if (existingUserByEmail && existingUserByEmail.clerkId !== userId) {
    // Email is already in use by another Clerk account
    if (existingUser) {
      // User exists by clerkId - update but don't change email
      try {
        const [dbUser] = await db.update(users)
          .set({
            firstName,
            lastName,
            role: finalRole,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, userId))
          .returning({
            id: users.id,
            clerkId: users.clerkId,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
          });
        if (dbUser) return dbUser;
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
        const [dbUser] = await db.insert(users)
          .values({
            clerkId: userId,
            email: uniqueEmail,
            firstName,
            lastName,
            role: finalRole,
          })
          .returning({
            id: users.id,
            clerkId: users.clerkId,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
          });
        if (dbUser) return dbUser;
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
    // User exists - update
    try {
      const [dbUser] = await db.update(users)
        .set({
          email,
          firstName,
          lastName,
          role: finalRole,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, userId))
        .returning({
          id: users.id,
          clerkId: users.clerkId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        });
      
      if (dbUser) {
        console.log("getCurrentUser - Updated existing user:", dbUser.id, dbUser.role);
        return dbUser;
      }
    } catch (updateError: any) {
      console.error("getCurrentUser - Error updating user:", updateError.message);
      // For errors, return a basic user object to prevent blocking
      console.warn("getCurrentUser - Returning minimal user object due to update error");
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
  
  // User doesn't exist or update failed - create new user
  console.log("getCurrentUser - Creating new user with role:", finalRole);
  try {
    const [dbUser] = await db.insert(users)
      .values({
        clerkId: userId,
        email,
        firstName,
        lastName,
        role: finalRole,
      })
      .returning({
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      });
    
    if (dbUser) {
      console.log("getCurrentUser - Created new user:", dbUser.id, dbUser.role);
      return dbUser;
    }
  } catch (error: any) {
    console.error("getCurrentUser - Create failed:", error.message);
    
    // Handle unique constraint violation on email
    const isEmailConstraintError = 
      error?.code === '23505' && 
      (error?.constraint === 'users_email_key' || error?.message?.includes('email'));
    
    if (isEmailConstraintError) {
      console.log("Email constraint violation during create, email was taken by another user");
      // Email was taken between our check and create - try to find the existing user
      try {
        const result = await db.select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        
        if (result && result.length > 0) {
          console.log("Found existing user by email, returning it");
          return {
            id: result[0].id,
            clerkId: result[0].clerkId,
            email: result[0].email,
            firstName: result[0].firstName,
            lastName: result[0].lastName,
            role: result[0].role as Role,
          };
        }
      } catch (findError: any) {
        console.error("Error finding user by email:", findError.message);
      }
      
      // If we can't find it, create with temporary email
      const uniqueEmail = `${userId.replace(/^user_/, '')}@clerk-${Date.now()}.temp`;
      console.warn(`Using temporary email: ${uniqueEmail}`);
      try {
        const [dbUser] = await db.insert(users)
          .values({
            clerkId: userId,
            email: uniqueEmail,
            firstName,
            lastName,
            role: finalRole,
          })
          .returning({
            id: users.id,
            clerkId: users.clerkId,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
          });
        if (dbUser) return dbUser;
      } catch (createError: any) {
        console.error("Error creating user with temp email:", createError.message);
      }
    }
    
    // For other errors, return a minimal user object to allow access
    console.warn("getCurrentUser - Returning minimal user object due to create error");
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

export async function requireAuth(requiredRole?: Role) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // All accounts are attorney accounts - ensure role is attorney
  if (user.role !== "attorney") {
    try {
      await db.update(users)
        .set({ role: "attorney", updatedAt: new Date() })
        .where(eq(users.id, user.id));
      user.role = "attorney";
    } catch (error: any) {
      console.error("Error updating user role:", error.message);
      // Continue anyway
      user.role = "attorney";
    }
  }

  // If a role is specified, it must be attorney (only role available)
  if (requiredRole && requiredRole !== "attorney") {
    throw new Error("Forbidden");
  }

  return user;
}
