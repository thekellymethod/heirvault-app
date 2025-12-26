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
  const accessRecords = await prisma.attorneyClientAccess.findMany({
    where: {
      attorneyId: user.id,
      isActive: true,
    },
    include: {
      clients: true,
    },
    orderBy: {
      grantedAt: 'desc',
    },
  });

  const clientList = accessRecords.map((r: typeof accessRecords[0]) => ({
    id: r.clients.id,
    firstName: r.clients.firstName,
    lastName: r.clients.lastName,
    email: r.clients.email,
    phone: r.clients.phone,
    dateOfBirth: r.clients.dateOfBirth,
    createdAt: r.clients.createdAt,
    updatedAt: r.clients.updatedAt,
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
  const result = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    // Create client
    const client = await tx.clients.create({
      data: {
        id: randomUUID(),
        email,
        firstName: firstName,
        lastName: lastName,
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
      },
    });

    // Grant attorney access
    await tx.attorneyClientAccess.create({
      data: {
        id: randomUUID(),
        attorneyId: user.id,
        clientId: client.id,
        isActive: true,
      },
    });

    return {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
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
