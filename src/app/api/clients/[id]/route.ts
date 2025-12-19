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
    console.log('GET /api/clients/[id] - Client ID:', id)
    
    const { user } = await getCurrentUserWithOrg()
    console.log('GET /api/clients/[id] - User:', user ? `${user.email} (${user.role})` : 'null')

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check access based on role
    // All attorneys have global access to all clients
    try {
      if (user.role === 'attorney') {
        console.log('GET /api/clients/[id] - Checking attorney access for client:', id)
        await assertAttorneyCanAccessClient(id)
        console.log('GET /api/clients/[id] - Attorney access granted (global)')
      } else {
        console.log('GET /api/clients/[id] - Checking client self-access for client:', id)
        await assertClientSelfAccess(id)
        console.log('GET /api/clients/[id] - Client self-access granted')
      }
    } catch (accessError: any) {
      console.error('GET /api/clients/[id] - Access check failed:', accessError)
      throw accessError
    }

    // Get client with relationships
    console.log('GET /api/clients/[id] - Fetching client from database')
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
        attorneyAccess: {
          where: { isActive: true },
          include: {
            attorney: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            grantedAt: 'asc', // First attorney granted access is likely the creator
          },
          take: 1, // Get the first one
        },
      },
    })

    if (!client) {
      console.log('GET /api/clients/[id] - Client not found in database')
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    console.log('GET /api/clients/[id] - Client found, logging audit event')
    try {
      await logAuditEvent({
        action: 'CLIENT_VIEWED',
        message: `Read client ${id}`,
        userId: user.id,
        clientId: id,
      })
      console.log('GET /api/clients/[id] - Audit event logged successfully')
    } catch (auditError: any) {
      console.error('GET /api/clients/[id] - Audit logging failed (non-fatal):', auditError)
      // Continue even if audit logging fails
    }

    console.log('GET /api/clients/[id] - Returning client data')
    return NextResponse.json(client)
  } catch (e: any) {
    console.error('Error in GET /api/clients/[id]:', e)
    const msg = e.message || 'Internal server error'
    const status = msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : 500
    return NextResponse.json(
      { error: msg },
      { status }
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
    // Parse dateOfBirth as local date to avoid timezone issues
    let parsedDateOfBirth: Date | undefined = undefined;
    if (dateOfBirth) {
      // Parse YYYY-MM-DD as local date (not UTC)
      const [year, month, day] = dateOfBirth.split('-').map(Number);
      parsedDateOfBirth = new Date(year, month - 1, day);
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone: phone ?? null,
        dateOfBirth: parsedDateOfBirth,
      },
    })

    await logAuditEvent({
      action: 'CLIENT_UPDATED',
      message: `Updated client ${id}: ${firstName} ${lastName}`,
      userId: user.id,
      clientId: id,
    })

    return NextResponse.json(client)
  } catch (error: any) {
    console.error('Error in PUT /api/clients/[id]:', error)
    const msg = error.message || 'Internal server error'
    const status = msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : 500
    return NextResponse.json(
      { error: msg },
      { status }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { user } = await getCurrentUserWithOrg()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check access - all attorneys have global access
    if (user.role === 'attorney') {
      await assertAttorneyCanAccessClient(id)
    } else {
      await assertClientSelfAccess(id)
    }

    // Check if client exists - use raw SQL first
    let clientExists = false;
    try {
      const existsResult = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM clients WHERE id = ${id} LIMIT 1
      `;
      clientExists = existsResult && existsResult.length > 0;
    } catch (sqlError: any) {
      console.error("Client DELETE: Raw SQL check failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
        const existingClient = await prisma.client.findUnique({
          where: { id },
          select: { id: true },
        });
        clientExists = !!existingClient;
      } catch (prismaError: any) {
        console.error("Client DELETE: Prisma check also failed:", prismaError.message);
        throw prismaError;
      }
    }

    if (!clientExists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Delete client - cascade deletes will handle related records (policies, beneficiaries, invites, etc.)
    // Use raw SQL first
    try {
      await prisma.$executeRaw`DELETE FROM clients WHERE id = ${id}`;
    } catch (sqlError: any) {
      console.error("Client DELETE: Raw SQL failed, trying Prisma:", sqlError.message);
      // Fallback to Prisma
      try {
        await prisma.client.delete({
          where: { id },
        });
      } catch (prismaError: any) {
        console.error("Client DELETE: Prisma also failed:", prismaError.message);
        throw prismaError;
      }
    }

    await logAuditEvent({
      action: 'CLIENT_UPDATED', // Using CLIENT_UPDATED as there's no CLIENT_DELETED action
      message: `Deleted client ${id}`,
      userId: user.id,
      clientId: id,
    })

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error('Error in DELETE /api/clients/[id]:', error)
    const msg = error.message || 'Internal server error'
    const status = msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : msg === 'Not found' ? 404 : 500
    return NextResponse.json(
      { error: msg },
      { status }
    )
  }
}

