import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserWithOrg } from "@/lib/authz";
import { randomUUID } from "crypto";

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
      const requesterMembershipResult = await prisma.$queryRawUnsafe<Array<{
        id: string;
        user_id: string;
        organization_id: string;
        role: string;
      }>>(
        `SELECT id, user_id, organization_id, role FROM org_members WHERE user_id = $1 AND organization_id = $2 AND role = $3 LIMIT 1`,
        user.id,
        organizationId,
        "OWNER"
      );
      
      if (!requesterMembershipResult || requesterMembershipResult.length === 0) {
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
    const targetUserResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
      email: string;
    }>>(
      `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      email
    );
    
    const targetUser = targetUserResult && targetUserResult.length > 0 ? targetUserResult[0] : null;

    // If user doesn't exist, we could create them or just return an error
    // For now, require the user to exist (they need to sign up first)
    if (!targetUser) {
      return NextResponse.json(
        { error: "User with this email not found. They must sign up first." },
        { status: 404 }
      );
    }

    // Check if current user is owner (only owners can invite)
    const currentMemberResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
      user_id: string;
      organization_id: string;
      role: string;
    }>>(
      `SELECT id, user_id, organization_id, role FROM org_members WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
      user.id,
      organizationId
    );

    const currentMember = currentMemberResult && currentMemberResult.length > 0 ? currentMemberResult[0] : null;

    if (currentMember?.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only owners can invite team members" },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMemberResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
    }>>(
      `SELECT id FROM org_members WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
      targetUser.id,
      organizationId
    );

    if (existingMemberResult && existingMemberResult.length > 0) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 400 }
      );
    }

    // Add user to organization
    await prisma.$executeRawUnsafe(
      `INSERT INTO org_members (id, user_id, organization_id, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      randomUUID(),
      targetUser.id,
      organizationId,
      role,
      new Date(),
      new Date()
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const statusCode = message === "Unauthorized" || message === "Forbidden" ? 401 : 400;
    return NextResponse.json(
      { error: message },
      { status: statusCode }
    );
  }
}

