import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAttorneyOrOwner } from '@/lib/authz'
import { assertCanCreateClient } from '@/lib/client-limits'
import { audit, logAuditEvent } from '@/lib/audit'
import { AuditAction } from '@/lib/db'
import { z } from 'zod'
import { jsonError, jsonOk } from '@/lib/http'
import { generateClientFingerprint, findClientByFingerprint } from '@/lib/client-fingerprint'

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
  } catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Unknown error";
} {
    console.error("requireAttorneyOrOwner error:", e);
    return jsonError(e.message || "Unauthorized", e.status || 401);
  }

  let orgInfo;
  try {
    orgInfo = await assertCanCreateClient();
  } catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Unknown error";
} {
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

    // Generate client fingerprint to check for duplicates
    const fingerprint = generateClientFingerprint({
      email,
      firstName,
      lastName,
      dateOfBirth: parsedDateOfBirth,
    });

    // Check if client with same fingerprint already exists
    const existingClientId = await findClientByFingerprint(fingerprint, prisma);
    if (existingClientId) {
      // Return existing client instead of creating duplicate
      const existingClient = await prisma.client.findUnique({
        where: { id: existingClientId },
      });
      
      if (existingClient) {
        // Grant attorney access to existing client if not already granted
        const existingAccess = await prisma.attorneyClientAccess.findFirst({
          where: {
            attorneyId: orgInfo.user.id,
            clientId: existingClientId,
            organizationId: org.id,
          },
        });

        if (!existingAccess) {
          await prisma.attorneyClientAccess.create({
            data: {
              attorneyId: orgInfo.user.id,
              clientId: existingClientId,
              organizationId: org.id,
              isActive: true,
            },
          });
        }

        await audit(AuditAction.CLIENT_CREATED, {
          clientId: existingClient.id,
          message: `Client access granted to existing client: ${existingClient.firstName} ${existingClient.lastName} (${existingClient.email})`,
        });

        return jsonOk(existingClient, { status: 200 });
      }
    }

    // Create new client with fingerprint
    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        email,
        dateOfBirth: parsedDateOfBirth,
        phone: phone ?? null,
        orgId: org.id,
        clientFingerprint: fingerprint,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 500;
    console.error("Error creating client:", error);
    return jsonError(message, status);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { requireAuth } = await import("@/lib/utils/clerk");
    const user = await requireAuth();

    // Only attorneys can access this endpoint - clients don't have accounts
    // They access their data via invitation links at /invite/[token]
    
    // Get ALL clients globally - all attorneys can see all clients
    // Use raw SQL first for reliability
    let clients: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      dateOfBirth: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    try {
      const rawResult = await prisma.$queryRaw<Array<{
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone: string | null;
        date_of_birth: Date | null;
        created_at: Date;
        updated_at: Date;
      }>>`
        SELECT 
          id,
          first_name,
          last_name,
          email,
          phone,
          date_of_birth,
          created_at,
          updated_at
        FROM clients
        ORDER BY created_at DESC
      `;

      clients = rawResult.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        dateOfBirth: row.date_of_birth,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Client list: Raw SQL failed, trying Prisma:", sqlErrorMessage);
      // Fallback to Prisma
      try {
        const prismaClients = await prisma.client.findMany({
          orderBy: {
            createdAt: "desc",
          },
        });
        clients = prismaClients.map(c => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          dateOfBirth: c.dateOfBirth,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));
      } catch (prismaError: unknown) {
        const prismaErrorMessage = prismaError instanceof Error ? prismaError.message : "Unknown error";
        console.error("Client list: Prisma also failed:", prismaErrorMessage);
        throw prismaError;
      }
    }

    await logAuditEvent({
      action: 'CLIENT_VIEWED',
      message: 'Listed all clients (global access)',
      userId: user.id,
    })

    return NextResponse.json(clients)
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' || error.message === 'Forbidden' ? 401 : 400 }
    )
  }
}
