import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/utils/clerk";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { id: clientId } = await params;

  // Access check
  const access = await prisma.attorneyClientAccess.findFirst({
    where: { attorneyId: user.id, clientId: clientId, isActive: true },
    select: { id: true },
  });

  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await prisma.clients.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          policies: true,
          beneficiaries: true,
          client_invites: true,
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({
    client: {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      dateOfBirth: client.dateOfBirth,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      _count: client._count,
    },
  });
}
