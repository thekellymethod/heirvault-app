import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
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

    // Use raw SQL first for reliability
    let updated: any = null;
    try {
      // Update user using raw SQL
      await prisma.$executeRaw`
        UPDATE users
        SET 
          first_name = ${firstName.trim()},
          last_name = ${lastName.trim()},
          bar_number = ${barNumber?.trim() || null},
          updated_at = NOW()
        WHERE id = ${currentUser.id}
      `;

      // Fetch updated user
      const updatedResult = await prisma.$queryRaw<Array<{
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        bar_number: string | null;
        created_at: Date;
        updated_at: Date;
      }>>`
        SELECT id, email, first_name, last_name, bar_number, created_at, updated_at
        FROM users
        WHERE id = ${currentUser.id}
      `;

      if (updatedResult && updatedResult.length > 0) {
        const row = updatedResult[0];
        updated = {
          id: row.id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          barNumber: row.bar_number,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
    } catch (sqlError: any) {
      console.error("User profile update: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
        updated = await prisma.user.update({
          where: { id: currentUser.id },
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            barNumber: barNumber?.trim() || null,
          },
        });
      } catch (prismaError: any) {
        console.error("User profile update: Prisma also failed:", prismaError.message);
        throw prismaError;
      }
    }

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}

