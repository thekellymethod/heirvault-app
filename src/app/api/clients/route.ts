import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
  const rows = await prisma.attorneyClientAccess.findMany({
    where: { attorneyId: user.id, isActive: true },
    select: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      grantedAt: true,
    },
    orderBy: { grantedAt: "desc" },
  });

  const clients = rows.map((r) => r.client);

  return NextResponse.json({ clients });
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
  const result = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    await tx.attorneyClientAccess.create({
      data: {
        attorneyId: user.id,
        clientId: client.id,
        isActive: true,
      },
      select: { id: true },
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
