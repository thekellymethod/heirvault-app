import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/utils/clerk'
import { logAuditEvent } from '@/lib/audit'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        insurer: true,
        client: true,
        beneficiaries: {
          include: {
            beneficiary: true,
          },
        },
      },
    })

    if (!policy) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check access via client
    // Admins have full access to all policies
    const { getOrCreateAppUser } = await import("@/lib/auth/CurrentUser");
    const { hasAdminRole } = await import("@/lib/auth/admin-bypass");
    const appUser = await getOrCreateAppUser();
    if (appUser && hasAdminRole(appUser)) {
      // Admin bypass - full access
    } else if (user.role === 'attorney') {
      // All attorneys have global access to all policies
      // Global access granted - no need to check specific access
    } else {
      // Client can only view their own policies
      const client = await prisma.client.findUnique({
        where: { id: policy.clientId },
      })

      if (!client || client.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    await logAuditEvent({
      action: 'read',
      resourceType: 'policy',
      resourceId: id,
      userId: user.id,
    })

    return NextResponse.json(policy)
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    // Check if policy exists and get clientId for access check
    const existingPolicy = await prisma.policy.findUnique({
      where: { id },
      include: { client: true },
    })

    if (!existingPolicy) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check access
    // All attorneys have global access to all policies
    if (user.role === 'attorney') {
      // Global access granted - no need to check specific access
    } else {
      if (existingPolicy.client.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const {
      insurerId,
      policyNumber,
      policyType,
    } = body

    // Update insurer if provided (separate from policy)
    let insurerIdToUse = existingPolicy.insurerId
    if (body.insurerName) {
      // Find or create insurer
      let insurer = await prisma.insurer.findFirst({
        where: { name: body.insurerName },
      })

      if (!insurer) {
        insurer = await prisma.insurer.create({
          data: {
            name: body.insurerName,
            contactPhone: body.insurerPhone || null,
            contactEmail: body.insurerEmail || null,
            website: body.insurerWebsite || null,
          },
        })
      } else {
        // Update existing insurer
        insurer = await prisma.insurer.update({
          where: { id: insurer.id },
          data: {
            contactPhone: body.insurerPhone || insurer.contactPhone,
            contactEmail: body.insurerEmail || insurer.contactEmail,
            website: body.insurerWebsite || insurer.website,
          },
        })
      }
      insurerIdToUse = insurer.id
    }

    // Update policy
    const policy = await prisma.policy.update({
      where: { id },
      data: {
        insurerId: insurerId || insurerIdToUse,
        policyNumber: policyNumber ?? null,
        policyType: policyType ?? null,
      },
    })

    await logAuditEvent({
      action: 'POLICY_UPDATED',
      resourceType: 'policy',
      resourceId: id,
      details: { policyNumber, policyType },
      userId: user.id,
    })

    return NextResponse.json(policy)
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Check if policy exists and get clientId for access check
    const existingPolicy = await prisma.policy.findUnique({
      where: { id },
      include: { client: true },
    })

    if (!existingPolicy) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check access
    // All attorneys have global access to all policies
    if (user.role === 'attorney') {
      // Global access granted - no need to check specific access
    } else {
      if (existingPolicy.client.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    await prisma.policy.delete({
      where: { id },
    })

    // Note: There's no POLICY_DELETED action in the enum, so we'll use POLICY_UPDATED
    // to track the deletion in the audit log
    await logAuditEvent({
      action: 'POLICY_UPDATED',
      resourceType: 'policy',
      resourceId: id,
      details: { deleted: true },
      userId: user.id,
    })

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
    )
  }
}

