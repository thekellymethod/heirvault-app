import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/utils/clerk";
import { prisma } from "@/lib/prisma";
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
  
  // Normalize Clerk role - handle all valid roles
  let clerkRole: "attorney" | "admin" | "client" | null = null;
  if (clerkRoleNormalized === "attorney" || clerkRoleNormalized === "admin" || clerkRoleNormalized === "client") {
    clerkRole = clerkRoleNormalized as "attorney" | "admin" | "client";
  }
  
  // Determine the actual role (Clerk metadata takes precedence, then DB)
  const actualRole = clerkRole || user.role || null;
  
  // If Clerk has a role but DB doesn't match, sync it
  if (clerkRole && user.role !== clerkRole) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: clerkRole },
    });
    user.role = clerkRole;
  }
  
  // If user doesn't have attorney role, redirect to complete page
  if (actualRole !== "attorney" && actualRole !== "admin") {
    redirect("/attorney/sign-in/complete");
  }
  
  // Check if user already has an organization - if so, redirect to dashboard
  let userWithOrg;
  try {
    userWithOrg = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        orgMemberships: {
          include: {
            organization: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user with org in onboard layout:", error);
    // Continue to show onboard page if there's an error
  }

  if (userWithOrg?.orgMemberships && userWithOrg.orgMemberships.length > 0) {
    console.log("Onboard layout: User already has organization, redirecting to dashboard");
    redirect("/dashboard");
  }
  
  console.log("Onboard layout: User authenticated, no org, showing onboard page");

  return <>{children}</>;
}

