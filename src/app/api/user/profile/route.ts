import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
;
import { getCurrentUser } from "@/lib/utils/clerk";

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use getCurrentUser to ensure user exists in database
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { firstName, lastName, barNumber } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Update user using Supabase
    const { update: updateUser, findUnique: findUniqueUser } = await import("@/lib/db");
    
    type UserRecord = {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      barNumber: string | null;
      createdAt: string;
      updatedAt: string;
    };
    
    // Update user
    await updateUser("users", { id: currentUser.id }, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      barNumber: barNumber?.trim() || null,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);

    // Fetch updated user
    const updated = await findUniqueUser<UserRecord>("users", { id: currentUser.id });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      barNumber: updated.barNumber,
      createdAt: new Date(updated.createdAt),
      updatedAt: new Date(updated.updatedAt),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to update profile" },
      { status: 500 }
    );
  }
}
