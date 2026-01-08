import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";

/**
 * Remove admin role from current user
 * This is a debug endpoint to remove admin access
 */
export async function POST(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
    
    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 400 });
    }

    const db = getDb();
    
    // Find user by clerkId
    const { data: userData, error: findError } = await db
      .from("users")
      .select("id, email, roles")
      .eq("clerkId", userId)
      .single();

    if (findError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentRoles = (userData.roles as string[]) || [];
    
    // Remove ADMIN role
    const newRoles = currentRoles.filter((r: string) => r !== "ADMIN");
    
    // Ensure USER role is present
    if (!newRoles.includes("USER")) {
      newRoles.push("USER");
    }

    // Update user
    const { data: updatedUser, error: updateError } = await db
      .from("users")
      .update({ roles: newRoles })
      .eq("id", userData.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Admin role removed",
      user: {
        email: updatedUser.email,
        previousRoles: currentRoles,
        newRoles: newRoles,
      },
      note: "Also remove your email from ADMIN_EMAILS in .env.local to prevent it from being re-added on next sign-in."
    });
  } catch (error) {
    console.error("Error removing admin role:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
