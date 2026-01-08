// src/app/api/attorney/clients/[clientId]/beneficiaries/proposed/route.ts
import { NextResponse } from "next/server";
// ;
import { requireVerifiedAttorney } from "@/lib/auth/guards";

export async function GET(_: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId: _clientId } = await ctx.params;

  // Note: Role/ownership enforcement should be added for production
  // For now, return empty array until ProposedBeneficiary model is added
  // When model exists, implement using Supabase:
  // - Use findMany("proposed_beneficiaries", { where: { clientId, status: "PROPOSED" } })
  // - Use findUnique("documents", { id: documentId }) for each item to get document details

  return NextResponse.json({
    ok: true,
    items: [],
  });
}

