import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/utils/clerk";
import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export default async function OnboardLayout({ children }: { children: ReactNode }) {
  // Get the current user
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("Error in getCurrentUser in onboard layout:", error);
    redirect("/attorney/sign-in");
  }
  
  if (!user) {
    console.log("Onboard layout: No user found, redirecting to sign-in");
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
      console.warn("Onboard layout: Could not update role in DB, setting locally:", updateError.message);
      user.role = "attorney";
    }
  }
  
  // Check if user already has an organization - if so, redirect to dashboard
  let userWithOrg;
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
  } catch (error: any) {
    console.error("Error fetching user with org in onboard layout:", error.message);
    // If Prisma fails, try raw SQL as fallback
    try {
      const rawResult = await prisma.$queryRaw<Array<{ user_id: string; organization_id: string; role: string }>>`
        SELECT user_id, organization_id, role 
        FROM org_members 
        WHERE user_id = ${user.id} 
        LIMIT 1
      `;
      if (rawResult && rawResult.length > 0) {
        // User has org membership - redirect to dashboard
        console.log("Onboard layout: Found org membership via raw SQL, redirecting to dashboard");
        redirect("/dashboard");
      } else {
        // No org membership - continue to show onboard page
        console.log("Onboard layout: No organization found via raw SQL, showing onboard page");
      }
    } catch (sqlError: any) {
      console.error("Onboard layout: Raw SQL also failed:", sqlError.message);
      // Continue to show onboard page if both fail - user can create org
      console.log("Onboard layout: Continuing to show onboard page despite errors");
    }
  }

  if (userWithOrg?.orgMemberships && userWithOrg.orgMemberships.length > 0) {
    console.log("Onboard layout: User already has organization, redirecting to dashboard");
    redirect("/dashboard");
  }
  
  console.log("Onboard layout: User authenticated, no org, showing onboard page");

  return <>{children}</>;
}

