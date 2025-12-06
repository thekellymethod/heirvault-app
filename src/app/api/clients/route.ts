import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAttorneyOrOwner } from '@/lib/authz'
import { assertCanCreateClient } from '@/lib/client-limits'
import { audit } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http'

const createClientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  dateOfBirth: z.string().refine(
    (v) => !Number.isNaN(Date.parse(v)),
    "Invalid date format",
  ),
  phone: z.string().max(30).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    await requireAttorneyOrOwner();
  } catch (e: any) {
    return jsonError(e.message || "Unauthorized", e.status || 401);
  }

  let orgInfo;
  try {
    orgInfo = await assertCanCreateClient();
  } catch (e: any) {
    if (e.code === "PLAN_LIMIT") {
      return jsonError(
        `Client limit reached for your plan. Limit: ${e.limit}`,
        403,
        "PLAN_LIMIT",
      );
    }
    return jsonError(e.message || "Unauthorized", 401);
  }

  const body = await req.json().catch(() => null);
  const parse = createClientSchema.safeParse(body);
  if (!parse.success) {
    return jsonError(
      "Validation error",
      422,
      "VALIDATION_ERROR",
      parse.error.flatten(),
    );
  }

  const { firstName, lastName, email, dateOfBirth, phone } = parse.data;
  const { org } = orgInfo;

  const client = await prisma.client.create({
    data: {
      firstName,
      lastName,
      email,
      dateOfBirth: new Date(dateOfBirth),
      phone: phone ?? null,
      orgId: org.id,
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

  return jsonOk(client, { status: 201 });
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
