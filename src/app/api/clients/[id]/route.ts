import { NextRequest, NextResponse } from 'next/server'
import { db, clients, policies, beneficiaries, insurers, policyBeneficiaries, attorneyClientAccess, users, eq, and, inArray, asc } from '@/lib/db'
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
    // All authenticated users are attorneys and have global access to all clients
    // Clients don't have accounts - they access via invitation tokens
    try {
      // Default to attorney access for all authenticated users
      // Only check client self-access if explicitly a client (which shouldn't happen)
      if (user.role === 'attorney' || !user.role) {
        console.log('GET /api/clients/[id] - Checking attorney access for client:', id)
        await assertAttorneyCanAccessClient(id)
        console.log('GET /api/clients/[id] - Attorney access granted (global)')
      } else {
        // This branch should rarely/never execute since clients don't have accounts
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
    
    // Get client
    const [client] = await db.select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    if (!client) {
      console.log('GET /api/clients/[id] - Client not found in database')
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Get policies with insurers
    const clientPolicies = await db.select({
      policy: policies,
      insurer: insurers,
    })
      .from(policies)
      .innerJoin(insurers, eq(policies.insurerId, insurers.id))
      .where(eq(policies.clientId, id));

    // Get policy beneficiaries for all policies of this client
    const policyIds = clientPolicies.map(p => p.policy.id);
    const policyBeneficiaryData = policyIds.length > 0
      ? await db.select({
          policyId: policyBeneficiaries.policyId,
          beneficiary: beneficiaries,
        })
          .from(policyBeneficiaries)
          .innerJoin(beneficiaries, eq(policyBeneficiaries.beneficiaryId, beneficiaries.id))
          .where(inArray(policyBeneficiaries.policyId, policyIds))
      : [];

    // Get all beneficiaries for client
    const clientBeneficiaries = await db.select()
      .from(beneficiaries)
      .where(eq(beneficiaries.clientId, id));

    // Get attorney access
    const attorneyAccessResult = await db.select({
      access: attorneyClientAccess,
      attorney: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      },
    })
      .from(attorneyClientAccess)
      .innerJoin(users, eq(attorneyClientAccess.attorneyId, users.id))
      .where(and(
        eq(attorneyClientAccess.clientId, id),
        eq(attorneyClientAccess.isActive, true)
      ))
      .orderBy(asc(attorneyClientAccess.grantedAt))
      .limit(1);
    
    const attorneyAccess = attorneyAccessResult[0] || null;

    // Combine policy beneficiaries with policies
    const policiesWithBeneficiaries = clientPolicies.map(p => ({
      ...p.policy,
      insurer: p.insurer,
      beneficiaries: policyBeneficiaryData
        .filter(pb => pb.policyId === p.policy.id)
        .map(pb => ({ beneficiary: pb.beneficiary })),
    }));

    // Combine all data
    const clientWithRelations = {
      ...client,
      policies: policiesWithBeneficiaries,
      beneficiaries: clientBeneficiaries,
      attorneyAccess: attorneyAccess ? [attorneyAccess] : [],
    };

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
    return NextResponse.json(clientWithRelations)
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
    // All authenticated users are attorneys and have global access to all clients
    // Clients don't have accounts - they access via invitation tokens
    if (user.role === 'attorney' || !user.role) {
      await assertAttorneyCanAccessClient(id)
    } else {
      // This branch should rarely/never execute since clients don't have accounts
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

