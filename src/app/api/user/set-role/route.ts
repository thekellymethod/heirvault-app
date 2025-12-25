import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
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

    // Check if user exists by clerkId
    const existingUserByClerkId = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    // Check if email is already used by a different user
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    });

    // Handle email conflict: if email exists for a different user
    if (existingUserByEmail && existingUserByEmail.clerkId !== userId) {
      // Email is already in use by another Clerk account
      if (existingUserByClerkId) {
        // User exists by clerkId - update but don't change email
        await prisma.user.update({
          where: { clerkId: userId },
          data: {
            firstName,
            lastName,
            role,
            // Don't update email - it belongs to another account
          },
        });
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
      await prisma.user.update({
        where: { clerkId: userId },
        data: {
          email,
          firstName,
          lastName,
          role,
        },
      });
    } else {
      // User doesn't exist - create new user
      // Use try-catch to handle race conditions where email might be taken between check and create
      try {
        await prisma.user.create({
          data: {
            clerkId: userId,
            email,
            firstName,
            lastName,
            role,
          },
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Create user error:", error);
        // Handle unique constraint violation on email
        const errorAny = error as { code?: string; meta?: { target?: string[]; target_name?: string }; message?: string };
        const isEmailConstraintError = 
          errorAny?.code === 'P2002' && 
          (errorAny?.meta?.target?.includes('email') || 
           errorAny?.meta?.target_name === 'users_email_key' ||
           errorAny?.message?.includes('email'));
        
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

