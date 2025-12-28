// src/app/api/public/change-request/status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/invites";
import { ChangeRequestStatus, DocumentClassificationStatus } from "@prisma/client";

function friendlyStatus(cs: DocumentClassificationStatus) {
  if (cs === DocumentClassificationStatus.APPROVED || cs === DocumentClassificationStatus.AUTO_ACCEPTED) return "Accepted";
  if (cs === DocumentClassificationStatus.NEEDS_REVIEW) return "Pending Review";
  if (cs === DocumentClassificationStatus.REJECTED) return "Resubmission Required";
  return "Received";
}

function friendlyPipeline(d: any) {
  const processingState = d.processingState ?? "QUEUED";
  if (processingState === "QUEUED" || processingState === "PROCESSING") return "Processing";
  return friendlyStatus(d.classificationStatus);
}

function labelDocType(dt: string) {
  switch (dt) {
    case "DRIVERS_LICENSE": return "Driver's License";
    case "PASSPORT": return "Passport";
    case "POLICY": return "Insurance Policy";
    case "BENEFICIARY_DOC": return "Beneficiary Document";
    case "TAX_W9": return "Tax Form";
    case "TAX_1040": return "Tax Return";
    case "TAX_OTHER": return "Tax Document";
    default: return "Document";
  }
}

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string") return NextResponse.json({ ok: false }, { status: 400 });

  const tokenHash = hashToken(token);
  const cr = await prisma.change_requests.findUnique({
    where: { tokenHash },
    include: {
      clients: true,
      documents: { orderBy: { createdAt: "asc" } },
      receiptArtifact: true,
    },
  });

  if (!cr) return NextResponse.json({ ok: false }, { status: 200 });

  // Only allow view while active
  if (![ChangeRequestStatus.OPEN, ChangeRequestStatus.SUBMITTED, ChangeRequestStatus.NEEDS_REVIEW].includes(cr.status)) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  if (cr.expiresAt.getTime() < Date.now()) return NextResponse.json({ ok: false }, { status: 200 });

  const docs = cr.documents.map((d) => ({
    type: labelDocType(d.fileType),
    status: friendlyPipeline(d),
    message: d.classificationStatus === DocumentClassificationStatus.REJECTED 
      ? (d.policyholderMessage ?? "Please re-upload a clearer document.") 
      : undefined,
  }));

  const receiptNumber = (cr.receiptArtifact?.metadata as any)?.receiptNumber ?? null;

  return NextResponse.json({
    ok: true,
    policyholder: `${cr.clients.firstName ?? ""} ${cr.clients.lastName ?? ""}`.trim() || "Policyholder",
    documents: docs,
    receipt: receiptNumber ? [receiptNumber] : [],
  });
}

