import { NextRequest, NextResponse } from "next/server";
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
  const accessRecords = await prisma.attorney_client_access.findMany({
    where: {
      attorney_id: user.id,
      is_active: true,
    },
    include: {
      clients: true,
    },
    orderBy: {
      granted_at: 'desc',
    },
  });

  const clientList = accessRecords.map((r) => ({
    id: r.clients.id,
    firstName: r.clients.first_name,
    lastName: r.clients.last_name,
    email: r.clients.email,
    phone: r.clients.phone,
    dateOfBirth: r.clients.date_of_birth,
    createdAt: r.clients.created_at,
    updatedAt: r.clients.updated_at,
  }));

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

  // Create client + grant attorney access in one transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create client
    const client = await tx.clients.create({
      data: {
        id: randomUUID(),
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
      },
    });

    // Grant attorney access
    await tx.attorney_client_access.create({
      data: {
        id: randomUUID(),
        attorney_id: user.id,
        client_id: client.id,
        is_active: true,
      },
    });

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
