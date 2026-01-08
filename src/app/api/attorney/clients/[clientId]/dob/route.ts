// src/app/api/attorney/clients/[clientId]/dob/route.ts
import { NextResponse } from "next/server";
;
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";

export async function POST(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dob } = await req.json().catch(() => ({}));
  if (!dob) return NextResponse.json({ error: "Missing dob" }, { status: 400 });

  const { clientId } = await ctx.params;

  const { update: updateDb, findUnique: findUniqueClient } = await import("@/lib/db");
  await updateDb("clients", { id: clientId }, {
    dateOfBirth: new Date(dob).toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // Fetch updated client for audit
  const updated = await findUniqueClient("clients", { id: clientId }) as any;

  await auditLog({
    actorType: "ATTORNEY",
    actorId: user.id,
    clientId,
    inviteId: null,
    action: "CLIENT_DOB_SET",
    metadata: { dob: updated?.dateOfBirth ? new Date(updated.dateOfBirth).toISOString() : null },
  });

  return NextResponse.json({ ok: true });
}

