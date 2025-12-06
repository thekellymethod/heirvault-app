import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUserWithOrg, assertAttorneyCanAccessClient, assertClientSelfAccess } from '@/lib/authz'
import { audit } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      clientId,
      insurerName,
      insurerPhone,
      insurerEmail,
      insurerWebsite,
      policyNumber,
      policyType,
    } = body

    if (!clientId || !insurerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check access - can be attorney or client
    const { user } = await getCurrentUserWithOrg()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role === 'attorney') {
      await assertAttorneyCanAccessClient(clientId)
    } else {
      await assertClientSelfAccess(clientId)
    }

    // Find or create insurer
    let insurer = await prisma.insurer.findFirst({
      where: { name: insurerName },
    })

    if (!insurer) {
      insurer = await prisma.insurer.create({
        data: {
          name: insurerName,
          contactPhone: insurerPhone || null,
          contactEmail: insurerEmail || null,
          website: insurerWebsite || null,
        },
      })
    } else {
      // Update existing insurer if new contact info provided
      if (insurerPhone || insurerEmail || insurerWebsite) {
        insurer = await prisma.insurer.update({
          where: { id: insurer.id },
          data: {
            contactPhone: insurerPhone || insurer.contactPhone,
            contactEmail: insurerEmail || insurer.contactEmail,
            website: insurerWebsite || insurer.website,
          },
        })
      }
    }

    // Create policy
    const policy = await prisma.policy.create({
      data: {
        clientId,
        insurerId: insurer.id,
        policyNumber: policyNumber || null,
        policyType: policyType || null,
      },
    })

    await audit(AuditAction.POLICY_CREATED, {
      clientId: policy.clientId,
      policyId: policy.id,
      message: `Policy created for client ${policy.clientId} with insurer ${insurer.name}`,
    })

    return NextResponse.json(policy, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId required' },
        { status: 400 }
      )
    }

    // Check access - can be attorney or client
    const { user } = await getCurrentUserWithOrg()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role === 'attorney') {
      await assertAttorneyCanAccessClient(clientId)
    } else {
      await assertClientSelfAccess(clientId)
    }

    const policies = await prisma.policy.findMany({
      where: { clientId },
      include: {
        insurer: true,
        beneficiaries: {
          include: {
            beneficiary: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    await logAuditEvent({
      action: 'read',
      resourceType: 'policy',
      resourceId: `list-${clientId}`,
      userId: user.id,
    })

    return NextResponse.json(policies)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
    )
  }
}

