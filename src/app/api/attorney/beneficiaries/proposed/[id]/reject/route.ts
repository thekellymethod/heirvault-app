// src/app/api/attorney/beneficiaries/proposed/[id]/reject/route.ts
import { NextResponse } from "next/server";
// ;
import { requireVerifiedAttorney } from "@/lib/auth/guards";
// import { auditLog } from "@/lib/audit";
// import { UploaderType } from "@prisma/client";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason: _reason } = await req.json().catch(() => ({}));
  const { id: _id } = await ctx.params;

  // Future: When ProposedBeneficiary model is added to schema, uncomment and implement:
  /*
  const pb = await prisma.proposedBeneficiary.findUnique({ where: { id } });
  if (!pb) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pb.status !== "PROPOSED") return NextResponse.json({ error: "Already decided" }, { status: 400 });

  await prisma.proposedBeneficiary.update({
    where: { id },
    data: { status: "REJECTED", decidedAt: new Date() },
  });

  await auditLog({
    actorType: UploaderType.ATTORNEY,
    actorId: user.id,
    clientId: pb.clientId,
    inviteId: null,
    action: "PROPOSED_BENEFICIARY_REJECTED",
    metadata: { proposedId: id, reason: typeof reason === "string" ? reason.slice(0, 200) : null },
  });
  */

  return NextResponse.json({ ok: true, note: "ProposedBeneficiary model not yet implemented" });
}

