// src/app/api/attorney/clients/[clientId]/dob/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { UploaderType } from "@prisma/client";

export async function POST(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dob } = await req.json().catch(() => ({}));
  if (!dob) return NextResponse.json({ error: "Missing dob" }, { status: 400 });

  const { clientId } = await ctx.params;

  const updated = await prisma.clients.update({
    where: { id: clientId },
    data: { dateOfBirth: new Date(dob) },
  });

  await auditLog({
    actorType: UploaderType.ATTORNEY,
    actorId: user.id,
    clientId,
    inviteId: null,
    action: "CLIENT_DOB_SET",
    metadata: { dob: updated.dateOfBirth?.toISOString() },
  });

  return NextResponse.json({ ok: true });
}

