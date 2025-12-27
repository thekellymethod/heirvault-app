// src/app/api/review/queue/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { DocumentClassificationStatus } from "@prisma/client";

export async function GET() {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // TODO: enforce admin OR attorney scope
  // For now, get documents that need review for this attorney's clients
  const accessRecords = await prisma.attorneyClientAccess.findMany({
    where: {
      attorneyId: user.id,
      isActive: true,
    },
    select: {
      clientId: true,
    },
  });

  const clientIds = accessRecords.map(r => r.clientId);

  // If admin, show all; otherwise filter by client access
  const whereClause = user.roles.includes("ADMIN")
    ? { classificationStatus: DocumentClassificationStatus.NEEDS_REVIEW }
    : {
        clientId: { in: clientIds },
        classificationStatus: DocumentClassificationStatus.NEEDS_REVIEW,
      };

  const docs = await prisma.documents.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { clients: true },
  });

  return NextResponse.json({
    ok: true,
    items: docs.map(d => ({
      documentId: d.id, // internal: this endpoint is not for policyholders
      clientName: `${d.clients.firstName ?? ""} ${d.clients.lastName ?? ""}`.trim(),
      docType: d.fileType,
      sensitivity: d.sensitivityLevel,
      confidence: d.confidenceScore ?? null,
      createdAt: d.createdAt,
    })),
  });
}

