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
    let updated: {
      id: string,
      email: string,
      firstName: string | null;
      lastName: string | null;
      barNumber: string | null;
      createdAt: Date;
      updatedAt: Date;
    } | null = null;
    try {
      // Update user using raw SQL
      await prisma.$executeRaw`
        UPDATE users
        SET 
          firstName = ${firstName.trim()},
          lastName = ${lastName.trim()},
          bar_number = ${barNumber?.trim() || null},
          updated_at = NOW()
        WHERE id = ${currentUser.id}
      `;

      // Fetch updated user
      const updatedResult = await prisma.$queryRaw<Array<{
        id: string,
        email: string,
        firstName: string | null;
        lastName: string | null;
        bar_number: string | null;
        createdAt: Date;
        updated_at: Date;
      }>>`
        SELECT id, email, firstName, lastName, bar_number, createdAt, updated_at
        FROM users
        WHERE id = ${currentUser.id}
      `;

      if (updatedResult && updatedResult.length > 0) {
        const row = updatedResult[0];
        updated = {
          id: row.id,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          barNumber: row.bar_number,
          createdAt: row.createdAt,
          updatedAt: row.updated_at,
        };
      }
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("User profile update: Raw SQL failed, trying Prisma:", sqlErrorMessage);
      // Fallback to Prisma
      try {
        const prismaResult = await prisma.user.update({
          where: { id: currentUser.id },
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            barNumber: barNumber?.trim() || null,
          },
        });
        updated = {
          id: prismaResult.id,
          email: prismaResult.email,
          firstName: prismaResult.firstName,
          lastName: prismaResult.lastName,
          barNumber: prismaResult.barNumber,
          createdAt: prismaResult.createdAt,
          updatedAt: prismaResult.updatedAt,
        };
      } catch (prismaError: unknown) {
        const prismaErrorMessage = prismaError instanceof Error ? prismaError.message : "Unknown error";
        console.error("User profile update: Prisma also failed:", prismaErrorMessage);
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to update profile" },
      { status: 500 }
    );
  }
}

