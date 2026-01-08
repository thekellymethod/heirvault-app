import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
;

export async function POST(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    // All accounts are attorney accounts - role is always attorney
    const role = "attorney";

    // Get user info from Clerk for database upsert
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null;
    const firstName = clerkUser?.firstName ?? null;
    const lastName = clerkUser?.lastName ?? null;

    if (!email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Update Clerk metadata
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });

    const { update: updateUser, create: createUser, getDb } = await import("@/lib/db");
    
    type UserRecord = {
      id: string;
      clerkId: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      role: string;
    };
    
    // Check if user exists by clerkId
    const db = getDb();
    const { data: usersByClerkId } = await db
      .from("users")
      .select("*")
      .eq("clerkId", userId)
      .limit(1);
    const existingUserByClerkId = usersByClerkId && usersByClerkId.length > 0 
      ? (usersByClerkId[0] as UserRecord) 
      : null;

    // Check if email is already used by a different user
    const { data: usersByEmail } = await db
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);
    const existingUserByEmail = usersByEmail && usersByEmail.length > 0 
      ? (usersByEmail[0] as UserRecord) 
      : null;

    // Handle email conflict: if email exists for a different user
    if (existingUserByEmail && existingUserByEmail.clerkId !== userId) {
      // Email is already in use by another Clerk account
      if (existingUserByClerkId) {
        // User exists by clerkId - update but don't change email
        await updateUser("users", { clerkId: userId }, {
          firstName,
          lastName,
          role,
          // Don't update email - it belongs to another account
        } as Record<string, unknown>);
      } else {
        // User doesn't exist yet, but email is taken - create without email conflict
        // This shouldn't happen normally, but handle it gracefully
        return NextResponse.json(
          { error: "Email is already associated with another account" },
          { status: 409 }
        );
      }
    } else if (existingUserByClerkId) {
      // User exists - just update
      await updateUser("users", { clerkId: userId }, {
        email,
        firstName,
        lastName,
        role,
      } as Record<string, unknown>);
    } else {
      // User doesn't exist - create new user
      // Use try-catch to handle race conditions where email might be taken between check and create
      try {
        const { randomUUID } = await import("crypto");
        await createUser("users", {
          id: randomUUID(),
          clerkId: userId,
          email,
          firstName,
          lastName,
          role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Record<string, unknown>);
      } catch (error: unknown) {
        console.error("Create user error:", error);
        // Check if it's a unique constraint violation on email
        const errorStr = String(error);
        const isEmailConstraintError = 
          errorStr.includes('unique') || 
          errorStr.includes('duplicate') ||
          errorStr.includes('email');
        
        if (isEmailConstraintError) {
          console.log("Email constraint violation during create, email was taken by another user");
          // Email was taken between our check and create - return error
          return NextResponse.json(
            { error: "Email is already associated with another account" },
            { status: 409 }
          );
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }

    return NextResponse.json({ success: true, role });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error setting user role:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

