import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthApi } from "@/lib/utils/clerk";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuthApi();
  if (auth.response) return auth.response;
  const { user } = auth;

  const clientId = params.id;

  // Access check
  const access = await prisma.attorneyClientAccess.findFirst({
    where: { attorneyId: user.id, clientId, isActive: true },
    select: { id: true },
  });

  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await prisma.client.findUnique({
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
          invites: true,
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ client });
}
