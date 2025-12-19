import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const clerkRole = (clerkUser?.publicMetadata as any)?.role;

    // Check database role
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    // All accounts are attorney accounts
    const isAttorney = clerkRole === "attorney" || dbUser?.role === "attorney" || !dbUser; // Default to attorney if no role set
    
    return NextResponse.json({
      clerkRole: clerkRole || null,
      dbRole: dbUser?.role || "attorney", // Default to attorney
      hasAttorneyRole: isAttorney, // All accounts are attorney accounts
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

