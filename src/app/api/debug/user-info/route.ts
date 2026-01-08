import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/utils/clerk";

export async function GET(_req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const dbUser = await getCurrentUser();
    
    const { findUnique: findUniqueUser, findMany: findManyMembers, findUnique: findUniqueOrg } = await import("@/lib/db");
    
    let userWithOrg = null;
    if (dbUser) {
      const user = await findUniqueUser<{ id: string }>("users", { id: dbUser.id });
      if (user) {
        const memberships = await findManyMembers("org_members", {
          where: { userId: user.id },
          limit: 1,
        });
        if (memberships && memberships.length > 0) {
          const membership = memberships[0] as { organizationId: string };
          const org = await findUniqueOrg<{ id: string; name: string }>("organizations", { id: membership.organizationId });
          userWithOrg = {
            id: user.id,
            orgMemberships: org ? [{
              organizations: org,
            }] : [],
          };
        }
      }
    }

    return NextResponse.json({
      clerkId: userId,
      clerkRole: (clerkUser?.publicMetadata as { role?: string })?.role,
      dbUser: dbUser ? {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      } : null,
      organization: userWithOrg?.orgMemberships?.[0]?.organizations ? {
        id: userWithOrg.orgMemberships[0].organizations.id,
        name: userWithOrg.orgMemberships[0].organizations.name,
      } : null,
      hasOrg: !!(userWithOrg?.orgMemberships && userWithOrg.orgMemberships.length > 0),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

