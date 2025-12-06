import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUserWithOrg, assertAttorneyCanAccessClient, assertClientSelfAccess } from '@/lib/authz'
import { logAuditEvent } from '@/lib/audit'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user } = await getCurrentUserWithOrg()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check access based on role
    if (user.role === 'attorney') {
      await assertAttorneyCanAccessClient(id)
    } else {
      await assertClientSelfAccess(id)
    }

    // Get client with relationships
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        policies: {
          include: {
            insurer: true,
            beneficiaries: {
              include: {
                beneficiary: true,
              },
            },
          },
        },
        beneficiaries: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await logAuditEvent({
      action: 'read',
      resourceType: 'client',
      resourceId: id,
      userId: user.id,
    })

    return NextResponse.json(client)
  } catch (e: any) {
    const msg = e.message || 'Unauthorized'
    return NextResponse.json(
      { error: msg },
      { status: msg === 'Unauthorized' ? 401 : 403 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user } = await getCurrentUserWithOrg()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check access based on role
    if (user.role === 'attorney') {
      await assertAttorneyCanAccessClient(id)
    } else {
      await assertClientSelfAccess(id)
    }

    const body = await req.json()

    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
    } = body

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id },
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Update client
    const client = await prisma.client.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone: phone ?? null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      },
    })

    await logAuditEvent({
      action: 'update',
      resourceType: 'client',
      resourceId: id,
      details: { firstName, lastName, email },
      userId: user.id,
    })

    return NextResponse.json(client)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
    )
  }
}

