// src/app/api/attorney/beneficiaries/proposed/[id]/reject/route.ts
import { NextResponse } from "next/server";
// ;
import { requireVerifiedAttorney } from "@/lib/auth/guards";
// import { logAuditEvent } from "@/lib/audit";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason: _reason } = await req.json().catch(() => ({}));
  const { id: _id } = await ctx.params;

  // Future: When ProposedBeneficiary model is added to schema, implement using Supabase:
  // - Use findUnique("proposed_beneficiaries", { id })
  // - Use update("proposed_beneficiaries", { id }, { status: "REJECTED", decidedAt: ... })
  // - Use logAuditEvent() for audit logging

  return NextResponse.json({ ok: true, note: "ProposedBeneficiary model not yet implemented" });
}

