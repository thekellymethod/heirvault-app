// src/app/api/public/intake/status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/invites";
import { ClientInviteStatus, DocumentClassificationStatus } from "@prisma/client";

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
    case "TAX_W9": return "Tax Form (W-9)";
    case "TAX_1040": return "Tax Return (1040)";
    case "TAX_OTHER": return "Tax Document";
    case "COURT_FILING": return "Court Filing";
    case "DEMAND_LETTER": return "Demand Letter";
    case "CLAIM_SUMMARY": return "Claim Summary";
    default: return "Document";
  }
}

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string") return NextResponse.json({ ok: false }, { status: 400 });

  const tokenHash = hashToken(token);
  const invite = await prisma.client_invites.findUnique({
    where: { tokenHash },
    include: {
      clients: true,
    },
  });

  if (!invite || invite.status !== ClientInviteStatus.ACTIVE) return NextResponse.json({ ok: false }, { status: 200 });

  // Get documents for this invite
  const docs = await prisma.documents.findMany({
    where: {
      clientId: invite.clientId,
      uploadedVia: "CLIENT_INVITE_UPLOAD",
      createdAt: { gte: invite.createdAt },
    },
    orderBy: { createdAt: "asc" },
  });

  const docStatuses = docs.map(d => ({
    type: labelDocType(d.fileType),
    status: friendlyPipeline(d),
    message: d.classificationStatus === DocumentClassificationStatus.REJECTED 
      ? (d.policyholderMessage ?? "Please re-upload a clearer document.") 
      : undefined,
  }));

  // Get receipts for this invite
  const receipts = await prisma.receipts.findMany({
    where: {
      inviteId: invite.id,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  // Expose only receipt numbers (not artifact ids)
  const receiptNumbers = receipts.map(r => r.receiptNumber);

  return NextResponse.json({
    ok: true,
    policyholder: `${invite.clients.firstName ?? ""} ${invite.clients.lastName ?? ""}`.trim() || "Policyholder",
    documents: docStatuses,
    receipts: receiptNumbers,
  });
}

