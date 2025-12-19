import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/utils/clerk";
import { prisma } from "@/lib/db";
import { currentUser, auth } from "@clerk/nextjs/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the current user
  let user;
  try {
    // First check if we have a Clerk session
    const { userId } = await auth();
    console.log("Dashboard layout - Clerk userId:", userId);
    
    if (!userId) {
      console.log("Dashboard layout: No Clerk userId, redirecting to sign-in");
      redirect("/attorney/sign-in");
    }
    
    user = await getCurrentUser();
    console.log("Dashboard layout - getCurrentUser result:", user ? `User found: ${user.email}` : "null");
  } catch (error) {
    console.error("Error in getCurrentUser in dashboard layout:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    // If it's a Prisma schema error, try to continue with Clerk user info
    if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('P2021'))) {
      console.warn("Dashboard layout - Prisma schema error detected, attempting to continue with Clerk user");
      const clerkUser = await currentUser();
      if (clerkUser) {
        // Create a minimal user object from Clerk data to allow dashboard access
        user = {
          id: clerkUser.id,
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
          firstName: clerkUser.firstName || null,
          lastName: clerkUser.lastName || null,
          role: 'attorney' as const,
        };
        console.log("Dashboard layout - Using Clerk user data as fallback");
      } else {
        redirect("/attorney/sign-in");
      }
    } else {
      redirect("/attorney/sign-in");
    }
  }
  
  if (!user) {
    // No user - go to sign in
    console.log("Dashboard layout: No user found after getCurrentUser, redirecting to sign-in");
    redirect("/attorney/sign-in");
  }
  
  // Check Clerk metadata to see if role is set there
  const clerkUser = await currentUser();
  const clerkRoleRaw = (clerkUser?.publicMetadata as any)?.role;
  const clerkRoleNormalized = clerkRoleRaw?.toLowerCase?.();
  
  // All accounts are attorney accounts - ensure role is set to attorney
  if (user.role !== "attorney") {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "attorney" },
      });
      user.role = "attorney";
    } catch (updateError: any) {
      // If Prisma fails, just set the role locally - don't block access
      console.warn("Dashboard layout: Could not update role in DB, setting locally:", updateError.message);
      user.role = "attorney";
    }
  }
  
  // User has attorney role - check if they have an organization
  // Use raw SQL first since Prisma client may be out of sync
  let userWithOrg;
  try {
    // Try raw SQL first - it's more reliable when Prisma client is broken
    const rawResult = await prisma.$queryRaw<Array<{ 
      user_id: string; 
      organization_id: string; 
      role: string;
      org_name: string;
    }>>`
      SELECT 
        om.user_id, 
        om.organization_id, 
        om.role,
        o.name as org_name
      FROM org_members om
      INNER JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = ${user.id} 
      LIMIT 1
    `;
    
    if (rawResult && rawResult.length > 0) {
      // User has org membership - allow access
      console.log("Dashboard layout: Found org membership via raw SQL");
      // Create a minimal userWithOrg object with correct structure
      userWithOrg = {
        id: user.id,
        orgMemberships: [{
          organizations: {
            id: rawResult[0].organization_id,
            name: rawResult[0].org_name || "Organization",
          },
        }],
      };
    } else {
      // No org membership found - redirect to onboarding
      console.log("Dashboard layout: No organization found, redirecting to onboard");
      redirect("/attorney/onboard");
    }
  } catch (sqlError: any) {
    console.error("Dashboard layout: Raw SQL failed, trying Prisma:", sqlError.message);
    // If raw SQL fails, try Prisma as fallback
    try {
      userWithOrg = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          orgMemberships: {
            include: {
              organizations: true,
            },
          },
        },
      });
    } catch (prismaError: any) {
      console.error("Dashboard layout: Prisma also failed:", prismaError.message);
      // If both fail, redirect to onboard so user can create org
      console.warn("Dashboard layout: All database queries failed, redirecting to onboard");
      redirect("/attorney/onboard");
    }
  }

  // If user doesn't have an organization, redirect to onboarding
  if (!userWithOrg?.orgMemberships || userWithOrg.orgMemberships.length === 0) {
    console.log("Dashboard layout: User has no organization, redirecting to onboard");
    redirect("/attorney/onboard");
  }
  
  console.log("Dashboard layout: User authenticated, has org, rendering dashboard");

  return <>{children}</>;
}
