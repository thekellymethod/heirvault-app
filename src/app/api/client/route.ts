import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAttorneyOrOwner } from '@/lib/authz'
import { assertCanCreateClient } from '@/lib/client-limits'
import { audit, logAuditEvent } from '@/lib/audit'
import { AuditAction } from '@prisma/client'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http'

const createClientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  dateOfBirth: z.string().refine(
    (v) => !v || !Number.isNaN(Date.parse(v)),
    "Invalid date format",
  ).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  policy: z.object({
    insurerId: z.string(),
    policyNumber: z.string().optional().nullable(),
    policyType: z.string().optional().nullable(),
  }).optional(),
});

export async function POST(req: Request) {
  try {
    await requireAttorneyOrOwner();
  } catch (e: any) {
    console.error("requireAttorneyOrOwner error:", e);
    return jsonError(e.message || "Unauthorized", e.status || 401);
  }

  let orgInfo;
  try {
    orgInfo = await assertCanCreateClient();
  } catch (e: any) {
    console.error("assertCanCreateClient error:", e);
    if (e.code === "PLAN_LIMIT") {
      return jsonError(
        `Client limit reached for your plan. Limit: ${e.limit}`,
        403,
        "PLAN_LIMIT",
      );
    }
    return jsonError(e.message || "Unauthorized", 401);
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error("JSON parse error:", e);
    return jsonError("Invalid request body", 400);
  }

  const parse = createClientSchema.safeParse(body);
  if (!parse.success) {
    console.error("Validation error:", parse.error);
    return jsonError(
      "Validation error",
      422,
      "VALIDATION_ERROR",
      parse.error.flatten(),
    );
  }

  try {
    const { firstName, lastName, email, dateOfBirth, phone, policy } = parse.data;
    const { org } = orgInfo;

    // Parse dateOfBirth as local date to avoid timezone issues
    let parsedDateOfBirth: Date | null = null;
    if (dateOfBirth) {
      // Parse YYYY-MM-DD as local date (not UTC)
      const [year, month, day] = dateOfBirth.split('-').map(Number);
      parsedDateOfBirth = new Date(year, month - 1, day);
    }

    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        email,
        dateOfBirth: parsedDateOfBirth,
        phone: phone ?? null,
        orgId: org.id,
      },
    });

    // Grant attorney access via AttorneyClientAccess
    await prisma.attorneyClientAccess.create({
      data: {
        attorneyId: orgInfo.user.id,
        clientId: client.id,
        organizationId: org.id,
        isActive: true,
      },
    });

    // Also create AccessGrant for organization-level access
    await prisma.accessGrant.create({
      data: {
        clientId: client.id,
        orgId: org.id,
        attorneyUserId: orgInfo.user.id,
        status: "ACTIVE",
        grantedByUserId: orgInfo.user.id,
      },
    });

    // Create policy if provided
    if (policy?.insurerId) {
      await prisma.policy.create({
        data: {
          clientId: client.id,
          insurerId: policy.insurerId,
          policyNumber: policy.policyNumber || null,
          policyType: policy.policyType || null,
        },
      });
    }

    await audit(AuditAction.CLIENT_CREATED, {
      clientId: client.id,
      message: `Client created: ${client.firstName} ${client.lastName} (${client.email})${policy ? ' with policy' : ''}`,
    });

    return jsonOk(client, { status: 201 });
  } catch (error: any) {
    console.error("Error creating client:", error);
    return jsonError(
      error.message || "Internal server error",
      error.status || 500,
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { requireAuth } = await import("@/lib/utils/clerk");
    const user = await requireAuth();

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
        action: 'CLIENT_VIEWED',
        message: 'Listed clients',
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
        action: 'CLIENT_VIEWED',
        message: `Viewed client ${client.id}`,
        userId: user.id,
        clientId: client.id,
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
