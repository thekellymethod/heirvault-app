import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserWithOrg } from "@/lib/authz";
import { OrgRole } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { user, orgMember } = await getCurrentUserWithOrg();

    if (!user || !orgMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Note: We'll check ownership after determining which org to use

    const body = await req.json();
    const { email, role, organizationId: requestedOrgId } = body;
    
    // Use organizationId from request if provided, otherwise use user's org
    const organizationId = requestedOrgId || orgMember.organizationId;
    
    // Verify user has permission to invite to this organization
    if (organizationId !== orgMember.organizationId) {
      // Check if user is owner of the requested organization
      const requesterMembership = await prisma.orgMember.findFirst({
        where: {
          userId: user.id,
          organizationId: organizationId,
          role: "OWNER",
        },
      });
      
      if (!requesterMembership) {
        return NextResponse.json(
          { error: "You can only invite members to your own organization" },
          { status: 403 }
        );
      }
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!role || !["OWNER", "ATTORNEY", "STAFF"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Check if user already exists
    let targetUser = await prisma.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, we could create them or just return an error
    // For now, require the user to exist (they need to sign up first)
    if (!targetUser) {
      return NextResponse.json(
        { error: "User with this email not found. They must sign up first." },
        { status: 404 }
      );
    }

    // Check if current user is owner (only owners can invite)
    const currentMember = await prisma.orgMember.findFirst({
      where: {
        userId: user.id,
        organizationId: organizationId,
      },
    });

    if (currentMember?.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only owners can invite team members" },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.orgMember.findFirst({
      where: {
        userId: targetUser.id,
        organizationId: organizationId,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 400 }
      );
    }

    // Add user to organization
    await prisma.orgMember.create({
      data: {
        userId: targetUser.id,
        organizationId: organizationId,
        role: role as OrgRole,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 400 }
    );
  }
}

