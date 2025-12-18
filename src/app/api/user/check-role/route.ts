import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({
      clerkRole: clerkRole || null,
      dbRole: dbUser?.role || null,
      hasAttorneyRole: clerkRole === "attorney" || clerkRole === "admin" || dbUser?.role === "attorney" || dbUser?.role === "admin",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

