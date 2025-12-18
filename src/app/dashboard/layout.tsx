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
    redirect("/attorney/sign-in");
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
  
  // If user doesn't have attorney role, handle accordingly
  if (actualRole !== "attorney" && actualRole !== "admin") {
    if (user.role === "client") {
      // User is a client, redirect to client portal
      redirect("/client-portal");
    } else {
      // User doesn't have attorney role - redirect to complete page to set it
      redirect("/attorney/sign-in/complete");
    }
  }
  
  // User has attorney role - check if they have an organization
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
    console.error("Error fetching user with org in dashboard layout:", error);
    redirect("/attorney/sign-in");
  }

  // If user doesn't have an organization, redirect to onboarding
  if (!userWithOrg?.orgMemberships || userWithOrg.orgMemberships.length === 0) {
    console.log("Dashboard layout: User has no organization, redirecting to onboard");
    redirect("/attorney/onboard");
  }
  
  console.log("Dashboard layout: User authenticated, has org, rendering dashboard");

  return <>{children}</>;
}
