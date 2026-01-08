import { NextRequest, NextResponse } from "next/server";
;
import { requireAuthPrincipal } from "@/lib/permissions/guard";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const principal = await requireAuthPrincipal();
    
    // Get user's org membership
    const { findMany: findManyMembers } = await import("@/lib/db");
    
    type OrgMemberRecord = {
      id: string;
      userId: string;
      organizationId: string;
      role: string;
    };
    
    const memberships = await findManyMembers<OrgMemberRecord>("org_members", {
      where: { userId: principal.dbUserId },
      limit: 1,
    });

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const orgMember = memberships[0];

    // Note: We'll check ownership after determining which org to use

    const body = await req.json();
    const { email, role, organizationId: requestedOrgId } = body;
    
    // Use organizationId from request if provided, otherwise use user's org
    const organizationId = requestedOrgId || orgMember.organizationId;
    
    // Verify user has permission to invite to this organization
    if (organizationId !== orgMember.organizationId) {
      // Check if user is owner of the requested organization
      const requesterMemberships = await findManyMembers<OrgMemberRecord>("org_members", {
        where: { userId: principal.dbUserId, organizationId, role: "OWNER" },
        limit: 1,
      });
      
      if (!requesterMemberships || requesterMemberships.length === 0) {
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
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    
    const { data: targetUserResult } = await db
      .from("users")
      .select("id, email")
      .ilike("email", email)
      .limit(1);
    
    const targetUser = targetUserResult && targetUserResult.length > 0 ? (targetUserResult[0] as { id: string; email: string }) : null;

    // If user doesn't exist, we could create them or just return an error
    // For now, require the user to exist (they need to sign up first)
    if (!targetUser) {
      return NextResponse.json(
        { error: "User with this email not found. They must sign up first." },
        { status: 404 }
      );
    }

    // Check if current user is owner (only owners can invite)
    const currentMemberships = await findManyMembers<OrgMemberRecord>("org_members", {
      where: { userId: principal.dbUserId, organizationId },
      limit: 1,
    });

    const currentMember = currentMemberships && currentMemberships.length > 0 ? currentMemberships[0] : null;

    if (currentMember?.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only owners can invite team members" },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMemberships = await findManyMembers<OrgMemberRecord>("org_members", {
      where: { userId: targetUser.id, organizationId },
      limit: 1,
    });

    if (existingMemberships && existingMemberships.length > 0) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 400 }
      );
    }

    // Add user to organization
    const { create: createDb } = await import("@/lib/db");
    await createDb("org_members", {
      id: randomUUID(),
      userId: targetUser.id,
      organizationId,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

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

