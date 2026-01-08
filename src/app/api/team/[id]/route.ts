import { NextRequest, NextResponse } from "next/server";
;
import { getCurrentUserWithOrg } from "@/lib/authz";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { user, orgMember } = await getCurrentUserWithOrg();

    if (!user || !orgMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { findMany: findManyMembers, findUnique: findUniqueMember, count: countMembers, update: updateMember } = await import("@/lib/db");
    
    // Check if current user is owner
    const currentMembers = await findManyMembers("org_members", {
      where: {
        userId: user.id,
        organizationId: orgMember.organizationId,
      },
      limit: 1,
    });
    
    const currentMember = currentMembers && currentMembers.length > 0 ? (currentMembers[0] as { role: string }) : null;

    if (currentMember?.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only owners can update team member roles" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { role } = body;

    if (!role || !["OWNER", "ATTORNEY", "STAFF"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Get the member being updated
    const memberToUpdate = await findUniqueMember<{ id: string; organizationId: string; role: string }>("org_members", { id });

    if (!memberToUpdate) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Ensure member is in the same org
    if (memberToUpdate.organizationId !== orgMember.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent removing the last owner
    if (memberToUpdate.role === "OWNER" && role !== "OWNER") {
      const ownerCount = await countMembers("org_members", {
        where: {
          organizationId: orgMember.organizationId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last owner" },
          { status: 400 }
        );
      }
    }

    const updated = await updateMember("org_members", { id }, {
      role,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isAuthError = errorMessage === "Unauthorized" || errorMessage === "Forbidden";
    return NextResponse.json(
      { error: errorMessage },
      { status: isAuthError ? 401 : 400 }
    );
  }
}

