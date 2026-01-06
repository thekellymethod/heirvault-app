// src/app/api/attorney/clients/[clientId]/policies/route.ts
import { NextResponse } from "next/server";
;
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { UploaderType } from "@prisma/client";
import crypto from "crypto";

export async function POST(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  // Note: Explicit client ownership check recommended for production (currently relies on requireVerifiedAttorney)
  const policy = await prisma.expected_policies.create({
    data: {
      id: crypto.randomUUID(),
      clientId,
      createdByUserId: user.id,
      carrierName: body.carrierName ?? null,
      carrierAlias: body.carrierAlias ?? null,
      policyNumber: body.policyNumber ?? null,
      policyType: body.policyType ?? null,
      expectedBeneficiaryCount: body.expectedBeneficiaryCount ?? null,
    },
  });

  await auditLog({
    actorType: UploaderType.ATTORNEY,
    actorId: user.id,
    clientId,
    inviteId: null,
    action: "POLICY_EXPECTED_FIELDS_SET",
    metadata: {
      policyId: policy.id,
      carrierName: policy.carrierName,
      hasPolicyNumber: !!policy.policyNumber,
    },
  });

  return NextResponse.json({ ok: true, policyId: policy.id });
}

