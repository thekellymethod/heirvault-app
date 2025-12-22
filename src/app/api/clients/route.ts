import { NextRequest, NextResponse } from "next/server";
import { db, attorneyClientAccess, clients, eq, and, desc, sql } from "@/lib/db";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/utils/clerk";
import { logAuditEvent } from "@/lib/audit";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function toDateOnlyOrNull(input: unknown) {
  if (!input) return null;
  const d = new Date(String(input));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const auth = await requireAuthApi();
  if (auth.response) return auth.response;
  const { user } = auth;

  // Attorney's accessible clients (via AttorneyClientAccess)
  const rows = await db
    .select({
      client: {
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        dateOfBirth: clients.dateOfBirth,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
      },
      grantedAt: attorneyClientAccess.grantedAt,
    })
    .from(attorneyClientAccess)
    .innerJoin(clients, eq(attorneyClientAccess.clientId, clients.id))
    .where(
      and(
        eq(attorneyClientAccess.attorneyId, user.id),
        eq(attorneyClientAccess.isActive, true)
      )
    )
    .orderBy(desc(attorneyClientAccess.grantedAt));

  const clientList = rows.map((r) => r.client);

  return NextResponse.json({ clients: clientList });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await req.json().catch(() => ({}));

  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const phone = body?.phone ? String(body.phone).trim() : null;
  const dateOfBirth = toDateOnlyOrNull(body?.dateOfBirth);

  if (!firstName || !lastName || !email) {
    return NextResponse.json(
      { error: "firstName, lastName, and email are required" },
      { status: 400 }
    );
  }

  // Create client + grant attorney access in one transaction.
  // Use raw SQL to only insert columns that exist in the database
  const clientId = randomUUID();
  const accessId = randomUUID();
  
  // Use Drizzle transaction with raw SQL to avoid columns that don't exist
  const result = await db.transaction(async (tx) => {
    // Insert client using raw SQL within transaction
    const clientResult = await tx.execute<Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    }>>(
      sql`INSERT INTO clients (id, email, first_name, last_name, phone, date_of_birth, created_at, updated_at)
          VALUES (${clientId}, ${email}, ${firstName}, ${lastName}, ${phone || null}, ${dateOfBirth || null}, NOW(), NOW())
          RETURNING id, first_name, last_name, email`
    );

    if (!clientResult.rows || clientResult.rows.length === 0) {
      throw new Error("Failed to create client");
    }

    const client = clientResult.rows[0] as { id: string; first_name: string; last_name: string; email: string };

    // Grant attorney access using raw SQL within transaction
    // Note: attorney_client_access table only has: id, attorney_id, client_id, organization_id, granted_at, revoked_at, is_active
    await tx.execute(
      sql`INSERT INTO attorney_client_access (id, attorney_id, client_id, is_active, granted_at)
          VALUES (${accessId}, ${user.id}, ${client.id}, true, NOW())`
    );

    return {
      id: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
    };
  });

  await logAuditEvent({
    action: "CLIENT_CREATED",
    resourceType: "client",
    resourceId: result.id,
    details: { firstName, lastName, email },
    userId: user.id,
  });

  return NextResponse.json({ client: result }, { status: 201 });
}
