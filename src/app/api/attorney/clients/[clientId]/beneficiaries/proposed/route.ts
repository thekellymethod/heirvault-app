// src/app/api/attorney/clients/[clientId]/beneficiaries/proposed/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVerifiedAttorney } from "@/lib/auth/guards";

export async function GET(_: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await ctx.params;

  // Note: Role/ownership enforcement should be added for production
  // For now, return empty array until ProposedBeneficiary model is added
  // When model exists, uncomment:
  /*
  const items = await prisma.proposedBeneficiary.findMany({
    where: { clientId, status: "PROPOSED" },
    orderBy: { createdAt: "desc" },
    include: { document: true },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    items: items.map((pb) => ({
      id: pb.id,
      fullName: pb.fullName,
      createdAt: pb.createdAt,
      documentId: pb.documentId,
      docType: pb.document.fileType,
      docStatus: pb.document.classificationStatus,
      sensitivity: pb.document.sensitivityLevel,
    })),
  });
  */

  return NextResponse.json({
    ok: true,
    items: [],
  });
}

