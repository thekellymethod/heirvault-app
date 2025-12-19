import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUserWithOrg } from "@/lib/authz"
import { logAuditEvent } from "@/lib/audit"

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

    // Use raw SQL first for reliability
    let organization: any = null;
    try {
      // Check if organization exists
      const existsResult = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM organizations WHERE id = ${id} LIMIT 1
      `;
      
      if (!existsResult || existsResult.length === 0) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }

      // Update organization using raw SQL
      await prisma.$executeRaw`
        UPDATE organizations
        SET 
          name = ${name},
          address_line1 = ${addressLine1 || null},
          address_line2 = ${addressLine2 || null},
          city = ${city || null},
          state = ${state || null},
          postal_code = ${postalCode || null},
          country = ${country || null},
          phone = ${phone || null},
          logo_url = ${logoUrl || null},
          updated_at = NOW()
        WHERE id = ${id}
      `;

      // Fetch updated organization
      const updatedResult = await prisma.$queryRaw<Array<{
        id: string;
        name: string;
        slug: string;
        address_line1: string | null;
        address_line2: string | null;
        city: string | null;
        state: string | null;
        postal_code: string | null;
        country: string | null;
        phone: string | null;
        logo_url: string | null;
        created_at: Date;
        updated_at: Date;
      }>>`
        SELECT 
          id, name, slug, address_line1, address_line2, city, state, 
          postal_code, country, phone, logo_url, created_at, updated_at
        FROM organizations
        WHERE id = ${id}
      `;

      if (updatedResult && updatedResult.length > 0) {
        const row = updatedResult[0];
        organization = {
          id: row.id,
          name: row.name,
          slug: row.slug,
          addressLine1: row.address_line1,
          addressLine2: row.address_line2,
          city: row.city,
          state: row.state,
          postalCode: row.postal_code,
          country: row.country,
          phone: row.phone,
          logoUrl: row.logo_url,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
    } catch (sqlError: any) {
      console.error("Organization update: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
        if ((prisma as any).organizations) {
          organization = await (prisma as any).organizations.update({
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
          organization = {
            ...organization,
            addressLine1: organization.address_line1,
            addressLine2: organization.address_line2,
            postalCode: organization.postal_code,
            logoUrl: organization.logo_url,
            createdAt: organization.created_at,
            updatedAt: organization.updated_at,
          };
        } else if ((prisma as any).organization) {
          organization = await (prisma as any).organization.update({
            where: { id },
            data: {
              name,
              addressLine1: addressLine1 || null,
              addressLine2: addressLine2 || null,
              city: city || null,
              state: state || null,
              postalCode: postalCode || null,
              country: country || null,
              phone: phone || null,
              logoUrl: logoUrl || null,
            },
          });
        } else {
          throw new Error("Neither organizations nor organization model found");
        }
      } catch (prismaError: any) {
        console.error("Organization update: Prisma also failed:", prismaError.message);
        throw prismaError;
      }
    }

    if (!organization) {
      return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
    }

    await logAuditEvent({
      action: "update",
      resourceType: "organization",
      resourceId: organization.id,
      details: { name, addressLine1, city, state },
      userId: user.id,
    })

    return NextResponse.json(organization)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 400 }
    )
  }
}

