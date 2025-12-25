import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/utils/clerk'
import { logAuditEvent } from '@/lib/audit'
import { randomUUID } from 'crypto'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const policy = await prisma.policies.findUnique({
      where: { id },
      include: {
        insurers: true,
        clients: true,
        policy_beneficiaries: {
          include: {
            beneficiaries: true,
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
      const client = await prisma.clients.findUnique({
        where: { id: policy.client_id },
      })

      if (!client || client.user_id !== user.id) {
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
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: message },
      { status: message === 'Unauthorized' || message === 'Forbidden' ? 401 : 400 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    // Check if policy exists and get clientId for access check
    const existingPolicy = await prisma.policies.findUnique({
      where: { id },
      include: { clients: true },
    })

    if (!existingPolicy) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check access
    // All attorneys have global access to all policies
    if (user.role === 'attorney') {
      // Global access granted - no need to check specific access
    } else {
      if (existingPolicy.clients.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const {
      insurerId,
      policyNumber,
      policyType,
    } = body

    // Update insurer if provided (separate from policy)
    let insurerIdToUse = existingPolicy.insurer_id
    if (body.insurerName) {
      // Find or create insurer
      let insurer = await prisma.insurers.findFirst({
        where: { name: body.insurerName },
      })

      if (!insurer) {
        insurer = await prisma.insurers.create({
          data: {
            id: randomUUID(),
            name: body.insurerName,
            contact_phone: body.insurerPhone || null,
            contact_email: body.insurerEmail || null,
            website: body.insurerWebsite || null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        })
      } else {
        // Update existing insurer
        insurer = await prisma.insurers.update({
          where: { id: insurer.id },
          data: {
            contact_phone: body.insurerPhone || insurer.contact_phone,
            contact_email: body.insurerEmail || insurer.contact_email,
            website: body.insurerWebsite || insurer.website,
          },
        })
      }
      insurerIdToUse = insurer.id
    }

    // Update policy
    const policy = await prisma.policies.update({
      where: { id },
      data: {
        insurer_id: insurerId || insurerIdToUse,
        policy_number: policyNumber ?? null,
        policy_type: policyType ?? null,
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
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: message },
      { status: message === 'Unauthorized' || message === 'Forbidden' ? 401 : 400 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Check if policy exists and get clientId for access check
    const existingPolicy = await prisma.policies.findUnique({
      where: { id },
      include: { clients: true },
    })

    if (!existingPolicy) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check access
    // All attorneys have global access to all policies
    if (user.role === 'attorney') {
      // Global access granted - no need to check specific access
    } else {
      if (existingPolicy.clients.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    await prisma.policies.delete({
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
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: message },
      { status: message === 'Unauthorized' || message === 'Forbidden' ? 401 : 400 }
    )
  }
}

