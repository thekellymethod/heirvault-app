import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Clerk user not found" }, { status: 401 });
    }

    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    const firstName = clerkUser.firstName;
    const lastName = clerkUser.lastName;
    const clerkRole = (clerkUser.publicMetadata as any)?.role;

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (existing) {
      // Update existing user
      const updated = await prisma.user.update({
        where: { clerkId: userId },
        data: {
          email,
          firstName,
          lastName,
          role: clerkRole || existing.role || "client",
        },
      });
      return NextResponse.json({ 
        success: true, 
        action: "updated",
        user: {
          id: updated.id,
          email: updated.email,
          role: updated.role,
        }
      });
    } else {
      // Create new user
      const created = await prisma.user.create({
        data: {
          clerkId: userId,
          email,
          firstName,
          lastName,
          role: clerkRole || "client",
        },
      });
      return NextResponse.json({ 
        success: true, 
        action: "created",
        user: {
          id: created.id,
          email: created.email,
          role: created.role,
        }
      });
    }
  } catch (error: any) {
    console.error("Error in create-user endpoint:", error);
    return NextResponse.json({ 
      error: error.message,
      details: error,
    }, { status: 500 });
  }
}

