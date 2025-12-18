import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/utils/clerk";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const dbUser = await getCurrentUser();
    
    const userWithOrg = dbUser ? await prisma.user.findUnique({
      where: { id: dbUser.id },
      include: {
        orgMemberships: {
          include: {
            organization: true,
          },
        },
      },
    }) : null;

    return NextResponse.json({
      clerkId: userId,
      clerkRole: (clerkUser?.publicMetadata as any)?.role,
      dbUser: dbUser ? {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      } : null,
      organization: userWithOrg?.orgMemberships?.[0]?.organization ? {
        id: userWithOrg.orgMemberships[0].organization.id,
        name: userWithOrg.orgMemberships[0].organization.name,
      } : null,
      hasOrg: !!(userWithOrg?.orgMemberships && userWithOrg.orgMemberships.length > 0),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

