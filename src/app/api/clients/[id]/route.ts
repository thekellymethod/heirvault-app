import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/utils/clerk";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthApi();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { id: clientId } = await params;

  // Access check
  const access = await prisma.attorney_client_access.findFirst({
    where: { attorney_id: user.id, client_id: clientId, is_active: true },
    select: { id: true },
  });

  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await prisma.clients.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      date_of_birth: true,
      created_at: true,
      updated_at: true,
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
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      phone: client.phone,
      dateOfBirth: client.date_of_birth,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
      _count: client._count,
    },
  });
}
