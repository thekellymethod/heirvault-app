import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/utils/clerk'
import { logAuditEvent } from '@/lib/audit'

interface Params {
  params: Promise<{ id: string }>
}

// Attach a beneficiary to this policy
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    const { beneficiaryId } = body

    if (!beneficiaryId) {
      return NextResponse.json(
        { error: 'beneficiaryId required' },
        { status: 400 }
      )
    }

    // Check if policy exists and get clientId for access check
    const policy = await prisma.policy.findUnique({
      where: { id },
      include: { client: true },
    })

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    // Check access
    if (user.role === 'attorney') {
      const access = await prisma.attorneyClientAccess.findFirst({
        where: {
          attorneyId: user.id,
          clientId: policy.clientId,
          isActive: true,
        },
      })

      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      if (policy.client.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Verify beneficiary belongs to same client
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
    })

    if (!beneficiary || beneficiary.clientId !== policy.clientId) {
      return NextResponse.json(
        { error: 'Beneficiary not found or does not belong to this client' },
        { status: 400 }
      )
    }

    const link = await prisma.policyBeneficiary.create({
      data: {
        policyId: id,
        beneficiaryId,
      },
    })

    await logAuditEvent({
      action: 'create',
      resourceType: 'policy_beneficiary',
      resourceId: link.id,
      details: { policyId: id, beneficiaryId },
      userId: user.id,
    })

    return NextResponse.json(link, { status: 201 })
  } catch (error: any) {
    // Handle unique constraint violation (already linked)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Beneficiary is already linked to this policy' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
    )
  }
}

// Detach a beneficiary
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const beneficiaryId = searchParams.get('beneficiaryId')

    if (!beneficiaryId) {
      return NextResponse.json(
        { error: 'beneficiaryId required' },
        { status: 400 }
      )
    }

    // Check if policy exists and get clientId for access check
    const policy = await prisma.policy.findUnique({
      where: { id },
      include: { client: true },
    })

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    // Check access
    if (user.role === 'attorney') {
      const access = await prisma.attorneyClientAccess.findFirst({
        where: {
          attorneyId: user.id,
          clientId: policy.clientId,
          isActive: true,
        },
      })

      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      if (policy.client.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    await prisma.policyBeneficiary.delete({
      where: {
        policyId_beneficiaryId: {
          policyId: id,
          beneficiaryId,
        },
      },
    })

    await logAuditEvent({
      action: 'delete',
      resourceType: 'policy_beneficiary',
      resourceId: `${id}-${beneficiaryId}`,
      details: { policyId: id, beneficiaryId },
      userId: user.id,
    })

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
    )
  }
}

