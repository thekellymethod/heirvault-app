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

    const organization = await prisma.organization.update({
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
    })

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

