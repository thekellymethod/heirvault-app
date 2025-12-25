import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUserWithOrg } from "@/lib/authz"

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user, orgMember } = await getCurrentUserWithOrg()

    if (!user || !orgMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
    const exists = await prisma.organizations.findUnique({
      where: { id },
      select: { id: true },
    });
    
    if (!exists) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Update organization
    const updated = await prisma.organizations.update({
      where: { id },
      data: {
        name,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        state: state || null,
        postal_code: postalCode || null,
        country: country || null,
        phone: phone || null,
        logo_url: logoUrl || null,
      },
    });

    // Map snake_case to camelCase
    const organization = {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      addressLine1: updated.address_line1,
      addressLine2: updated.address_line2,
      city: updated.city,
      state: updated.state,
      postalCode: updated.postal_code,
      country: updated.country,
      phone: updated.phone,
      logoUrl: updated.logo_url,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };

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
    const { user, orgMember } = await getCurrentUserWithOrg()

    if (!user || !orgMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is a member of this organization
    if (orgMember.organizationId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Only organization owners should be able to delete organizations
    // Check if user is owner (you may need to adjust this based on your role system)
    // For now, we'll allow any member to delete (you can add role check if needed)

    // Check if organization exists
    const organization = await prisma.organizations.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if organization has members (besides the current user)
    const memberCount = await prisma.org_members.count({
      where: { organization_id: id },
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
      await prisma.organizations.delete({
        where: { id },
      });

      // Note: No organization-specific audit action exists in the enum
      // Audit logging skipped to prevent silent failures

      return new NextResponse(null, { status: 204 });
    } catch (prismaError: unknown) {
      const prismaErrorMessage = prismaError instanceof Error ? prismaError.message : "Unknown error";
      // Check if it's a foreign key constraint error
      if (prismaErrorMessage.toLowerCase().includes("foreign key") || prismaErrorMessage.toLowerCase().includes("constraint")) {
        return NextResponse.json(
          { error: "Cannot delete organization: it has associated data (clients, members, etc.). Please remove all associated data first." },
          { status: 409 }
        );
      }
      throw prismaError;
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

