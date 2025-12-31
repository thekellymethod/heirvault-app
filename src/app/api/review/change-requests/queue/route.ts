// src/app/api/review/change-requests/queue/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { ChangeRequestStatus } from "@prisma/client";

export async function GET() {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Note: Explicit ownership filtering recommended for production (currently returns all change requests)
  const items = await prisma.change_requests.findMany({
    where: { status: { in: [ChangeRequestStatus.SUBMITTED, ChangeRequestStatus.NEEDS_REVIEW] } },
    orderBy: { createdAt: "desc" },
    include: { clients: true, documents: true },
    take: 100,
  });

  return NextResponse.json({
    ok: true,
    items: items.map(cr => ({
      changeRequestId: cr.id,
      clientName: `${cr.clients.firstName ?? ""} ${cr.clients.lastName ?? ""}`.trim(),
      requestType: cr.requestType,
      status: cr.status,
      submittedAt: cr.submittedAt,
      docCount: cr.documents.length,
    })),
  });
}

