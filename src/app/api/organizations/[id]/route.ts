import { NextRequest, NextResponse } from "next/server"

import { requireAuthPrincipal } from "@/lib/permissions/guard"

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const principal = await requireAuthPrincipal()
    
    // Get user's org membership
    const { findMany: findManyMembers } = await import("@/lib/db");
    
    type OrgMemberRecord = {
      id: string;
      userId: string;
      organizationId: string;
    };
    
    const memberships = await findManyMembers<OrgMemberRecord>("org_members", {
      where: { userId: principal.dbUserId },
      limit: 1,
    });

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgMember = memberships[0];

    // Verify user is a member of this organization
    if (orgMember.organizationId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      phone,
      logoUrl,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      )
    }

    // Check if organization exists
    const { findUnique: findUniqueOrg, update: updateOrg } = await import("@/lib/db");
    const exists = await findUniqueOrg("organizations", { id });
    
    if (!exists) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Update organization
    const updated = await updateOrg("organizations", { id }, {
      name,
      addressLine1: addressLine1 || null,
      addressLine2: addressLine2 || null,
      city: city || null,
      state: state || null,
      postalCode: postalCode || null,
      country: country || null,
      phone: phone || null,
      logoUrl: logoUrl || null,
      updatedAt: new Date().toISOString(),
    } as any) as any;

    // Return the updated organization
    const organization = updated;

    if (!organization) {
      return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
    }

    // Note: No organization-specific audit action exists in the enum
    // Audit logging skipped to prevent silent failures

    return NextResponse.json(organization)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" || message === "Forbidden" ? 401 : 400 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const principal = await requireAuthPrincipal()
    
    // Get user's org membership
    const { findMany: findManyMembers, findUnique: findUniqueOrg, count: countDb, deleteRecord } = await import("@/lib/db");
    
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgMember = memberships[0];

    // Verify user is a member of this organization
    if (orgMember.organizationId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Only organization owners should be able to delete organizations
    if (orgMember.role !== "OWNER") {
      return NextResponse.json({ error: "Only organization owners can delete organizations" }, { status: 403 })
    }

    // Check if organization exists
    const organization = await findUniqueOrg("organizations", { id });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if organization has members (besides the current user)
    const memberCount = await countDb("org_members", {
      organizationId: id,
    });

    // Warn if there are other members (optional - you can make this a hard requirement)
    if (memberCount > 1) {
      // You might want to return an error here instead
      // return NextResponse.json(
      //   { error: "Cannot delete organization with other members. Please remove all members first." },
      //   { status: 409 }
      // );
    }

    try {
      // Delete organization (cascade deletes will handle org_members, clients, etc.)
      await deleteRecord("organizations", { id });

      // Note: No organization-specific audit action exists in the enum
      // Audit logging skipped to prevent silent failures

      return new NextResponse(null, { status: 204 });
    } catch (deleteError: unknown) {
      const errorMessage = deleteError instanceof Error ? deleteError.message : "Unknown error";
      // Check if it's a foreign key constraint error
      if (errorMessage.toLowerCase().includes("foreign key") || errorMessage.toLowerCase().includes("constraint")) {
        return NextResponse.json(
          { error: "Cannot delete organization: it has associated data (clients, members, etc.). Please remove all associated data first." },
          { status: 409 }
        );
      }
      throw deleteError;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to delete organization";
    const status = message === "Unauthorized" || message === "Forbidden" ? 401 : message.includes("Cannot delete") ? 409 : 400;
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}

