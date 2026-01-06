// src/app/api/attorney/beneficiaries/proposed/[id]/confirm/route.ts
import { NextResponse } from "next/server";
// ;
import { requireVerifiedAttorney } from "@/lib/auth/guards";
// import { auditLog } from "@/lib/audit";
// import { UploaderType } from "@prisma/client";
// import crypto from "crypto";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: _id } = await ctx.params;

  // Future: When ProposedBeneficiary model is added to schema, uncomment and implement:
  /*
  const pb = await prisma.proposedBeneficiary.findUnique({ where: { id } });
  if (!pb) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pb.status !== "PROPOSED") return NextResponse.json({ error: "Already decided" }, { status: 400 });

  const versionGroupId = `beneficiary:${pb.clientId}:${pb.fullName.toLowerCase().replace(/\s+/g, " ").trim()}`;
  const latest = await prisma.beneficiaries.findFirst({
    where: { clientId: pb.clientId, versionGroupId },
    orderBy: { versionNumber: "desc" },
  });
  const nextVersion = (latest?.versionNumber ?? 0) + 1;

  await prisma.$transaction(async (tx) => {
    // Parse fullName into firstName/lastName
    const nameParts = pb.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    await tx.beneficiaries.create({
      data: {
        id: crypto.randomUUID(),
        clientId: pb.clientId,
        firstName,
        lastName,
        isActive: true,
        versionGroupId,
        versionNumber: nextVersion,
      },
    });

    await tx.proposedBeneficiary.update({
      where: { id: pb.id },
      data: { status: "CONFIRMED", decidedAt: new Date() },
    });
  });

  await auditLog({
    actorType: UploaderType.ATTORNEY,
    actorId: user.id,
    clientId: pb.clientId,
    inviteId: null,
    action: "PROPOSED_BENEFICIARY_CONFIRMED",
    metadata: { proposedId: pb.id, fullName: pb.fullName, documentId: pb.documentId },
  });
  */

  return NextResponse.json({ ok: true, note: "ProposedBeneficiary model not yet implemented" });
}

