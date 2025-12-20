import { auth, currentUser } from "@clerk/nextjs/server";
import { db, users, eq } from "@/lib/db";
import { NextResponse } from "next/server";

type Role = "attorney";

/**
 * Get the current authenticated user from the database.
 * All authenticated users are attorneys.
 * Creates or updates the user record as needed.
 */
export async function getCurrentUser() {
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
    } catch (error: any) {
      console.error("Error updating user:", error.message);
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
  } catch (error: any) {
    console.error("Error creating user:", error.message);
    
    // Handle unique constraint violation on email
    if (error?.code === '23505' && error?.constraint === 'users_email_key') {
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
}

/**
 * Require authentication for page components.
 * Returns the authenticated attorney user or throws an error.
 * @param role - Optional role parameter (ignored, all users are attorneys)
 */
export async function requireAuth(role?: string): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>> {
  const user = await getCurrentUser();
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
    } catch (error: any) {
      console.error("Error updating user role:", error.message);
      user.role = "attorney";
    }
  }

  return user;
}

/**
 * Require authentication for API routes.
 * Returns the authenticated attorney user or returns a 401 response.
 * Use this in all API route handlers that require attorney authentication.
 */
export async function requireAuthApi(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  response?: never;
} | {
  user?: never;
  response: NextResponse;
}> {
  try {
    const user = await requireAuth();
    return { user };
  } catch (error) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }
}
