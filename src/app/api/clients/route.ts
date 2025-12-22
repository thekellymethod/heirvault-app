import { NextRequest, NextResponse } from "next/server";
import { db, attorneyClientAccess, clients, eq, and, desc } from "@/lib/db";
import { requireAuthApi } from "@/lib/utils/clerk";
import { logAuditEvent } from "@/lib/audit";

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
  // Use Drizzle's transaction support
  const result = await db.transaction(async (tx) => {
    // Insert client
    const [client] = await tx
      .insert(clients)
      .values({
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
      })
      .returning({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
      });

    if (!client) {
      throw new Error("Failed to create client");
    }

    // Grant attorney access
    await tx.insert(attorneyClientAccess).values({
      attorneyId: user.id,
      clientId: client.id,
      isActive: true,
    });

    return client;
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
