import { auth, currentUser } from "@clerk/nextjs/server";
import { db, users, eq } from "@/lib/db";

type Role = "attorney";

export type User = {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
};

/**
 * Get the current authenticated user from the database.
 * All authenticated users are attorneys.
 * Creates or updates the user record as needed.
 * 
 * Returns null if user is not authenticated.
 */
export async function getUser(): Promise<User | null> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return null;
    }

    const cu = await currentUser();
    if (!cu) {
      return null;
    }

    const email = cu.emailAddresses?.[0]?.emailAddress ?? null;
    const firstName = cu.firstName ?? null;
    const lastName = cu.lastName ?? null;

    if (!email) {
      console.warn("getUser: No email found for user", userId);
      return null;
    }

    // All accounts are attorney accounts
    const role: Role = "attorney";

    // Check if user exists in database
    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (existingUser) {
      // Update existing user
      try {
        const [updatedUser] = await db.update(users)
          .set({
            email,
            firstName,
            lastName,
            role,
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
        
        if (updatedUser) {
          return updatedUser;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error updating user:", errorMessage);
        // Return existing user on error
        return existingUser;
      }
    }
  
    // Create new user
    try {
      const [newUser] = await db.insert(users)
        .values({
          clerkId: userId,
          email,
          firstName,
          lastName,
          role,
        })
        .returning({
          id: users.id,
          clerkId: users.clerkId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        });
      
      if (newUser) {
        return newUser;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error creating user:", errorMessage);
      
      // Handle unique constraint violation on email
      if (error instanceof Error && error.message.includes('23505') && error.message.includes('users_email_key')) {
        // Email was taken - try to find the existing user
        const [foundUser] = await db.select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        
        if (foundUser) {
          return foundUser;
        }
      }
    }

    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    // Top-level error handler - log and return null to prevent blocking
    console.error("getUser: Unexpected error:", errorMessage);
    return null;
  }
}

/**
 * Require attorney authentication.
 * Throws an error if user is not authenticated or not an attorney.
 * 
 * Fail fast if role mismatch - ensures only attorneys can access.
 */
export async function requireAttorney(): Promise<User> {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Ensure role is attorney (should always be, but enforce it)
  if (user.role !== "attorney") {
    try {
      await db.update(users)
        .set({ role: "attorney", updatedAt: new Date() })
        .where(eq(users.id, user.id));
      user.role = "attorney";
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error updating user role:", errorMessage);
      user.role = "attorney";
    }
  }

  return user;
}

/**
 * Require admin authentication.
 * Throws an error if user is not authenticated, not an attorney, or not an admin.
 * 
 * Fail fast if role mismatch - ensures only admins can access.
 */
export async function requireAdmin(): Promise<User> {
  // First require attorney authentication
  const user = await requireAttorney();
  
  // Then check admin status
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
  if (adminEmails.length === 0) {
    throw new Error("Forbidden: Admin access required");
  }

  const isAdmin = adminEmails.includes(user.email.toLowerCase());
  if (!isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}
