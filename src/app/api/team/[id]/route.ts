import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    // Check if current user is owner
    const currentMember = await prisma.orgMember.findFirst({
      where: {
        userId: user.id,
        organizationId: orgMember.organizationId,
      },
    });

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
    const memberToUpdate = await prisma.orgMember.findUnique({
      where: { id },
      include: {
        organizations: true,
      },
    });

    if (!memberToUpdate) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Ensure member is in the same org
    if (memberToUpdate.organizationId !== orgMember.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent removing the last owner
    if (memberToUpdate.role === "OWNER" && role !== "OWNER") {
      const ownerCount = await prisma.orgMember.count({
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

    const updated = await prisma.orgMember.update({
      where: { id },
      data: { role },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 400 }
    );
  }
}

