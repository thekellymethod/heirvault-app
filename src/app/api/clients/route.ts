import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { assertCanCreateClient } from '@/lib/client-limits'
import { audit } from '@/lib/audit'
import { AuditAction } from '@prisma/client'

export async function POST(req: NextRequest) {
  let orgInfo;
  try {
    orgInfo = await assertCanCreateClient();
  } catch (e: any) {
    if (e.code === "PLAN_LIMIT") {
      return NextResponse.json(
        { error: `Client limit reached for your plan. Limit: ${e.limit}` },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: e.message || "Unauthorized" },
      { status: 401 }
    );
  }

  const { org } = orgInfo;

  const body = await req.json();
  const { firstName, lastName, email, dateOfBirth, phone } = body;

  if (!email || !firstName || !lastName || !dateOfBirth) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create client
  const client = await prisma.client.create({
    data: {
      email,
      firstName,
      lastName,
      phone: phone || null,
      dateOfBirth: new Date(dateOfBirth),
      orgId: org.id, // scope client to firm
    },
  });

  // Grant attorney access
  await prisma.attorneyClientAccess.create({
    data: {
      attorneyId: orgInfo.user.id,
      clientId: client.id,
      organizationId: org.id,
      isActive: true,
    },
  });

  await audit(AuditAction.CLIENT_CREATED, {
    clientId: client.id,
    message: `Client created: ${client.firstName} ${client.lastName} (${client.email})`,
  });

  return NextResponse.json(client, { status: 201 });
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()

    if (user.role === 'attorney') {
      // Get clients for attorney
      const access = await prisma.attorneyClientAccess.findMany({
        where: {
          attorneyId: user.id,
          isActive: true,
        },
        include: {
          client: true,
        },
      })

      const clients = access.map(a => a.client)

      await logAuditEvent({
        action: 'read',
        resourceType: 'client',
        resourceId: 'list',
        userId: user.id,
      })

      return NextResponse.json(clients)
    } else {
      // Client viewing their own data
      const client = await prisma.client.findUnique({
        where: { userId: user.id },
      })

      if (!client) {
        return NextResponse.json({ error: 'Client record not found' }, { status: 404 })
      }

      await logAuditEvent({
        action: 'read',
        resourceType: 'client',
        resourceId: client.id,
        userId: user.id,
      })

      return NextResponse.json(client)
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
    )
  }
}
