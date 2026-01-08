// src/app/api/public/intake/status/route.ts
import { NextResponse } from "next/server";
;
import { hashToken } from "@/lib/invites";
import { ClientInviteStatus, DocumentClassificationStatus } from "@/lib/db/enums";

function friendlyStatus(cs: string) {
  if (cs === DocumentClassificationStatus.APPROVED || cs === DocumentClassificationStatus.AUTO_ACCEPTED) return "Accepted";
  if (cs === DocumentClassificationStatus.NEEDS_REVIEW) return "Pending Review";
  if (cs === DocumentClassificationStatus.REJECTED) return "Resubmission Required";
  return "Received";
}

function friendlyPipeline(d: { processingState?: string | null; classificationStatus: string }) {
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
  const { findUnique: findUniqueInvite, findUnique: findUniqueClient, findMany: findManyReceipts, getDb } = await import("@/lib/db");
  
  type InviteRecord = {
    id: string;
    tokenHash: string;
    status: string;
    clientId: string;
    createdAt: string;
  };
  
  type ClientRecord = {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
  
  type DocumentRecord = {
    fileType: string;
    processingState: string | null;
    classificationStatus: string;
    policyholderMessage: string | null;
  };
  
  type ReceiptRecord = {
    receiptNumber: string;
  };
  
  const invite = await findUniqueInvite<InviteRecord>("client_invites", { tokenHash });

  if (!invite || invite.status !== ClientInviteStatus.PENDING) return NextResponse.json({ ok: false }, { status: 200 });

  // Fetch client separately
  const client = await findUniqueClient<ClientRecord>("clients", { id: invite.clientId });
  if (!client) return NextResponse.json({ ok: false }, { status: 200 });

  // Get documents for this invite
  const db = getDb();
  const { data: docsData } = await db
    .from("documents")
    .select("*")
    .eq("clientId", invite.clientId)
    .eq("uploadedVia", "CLIENT_INVITE_UPLOAD")
    .gte("createdAt", invite.createdAt)
    .order("createdAt", { ascending: true });
  
  const docs = (docsData || []) as DocumentRecord[];

  const docStatuses = docs.map(d => ({
    type: labelDocType(d.fileType),
    status: friendlyPipeline({ 
      processingState: d.processingState ?? undefined, 
      classificationStatus: d.classificationStatus 
    }),
    message: d.classificationStatus === DocumentClassificationStatus.REJECTED 
      ? (d.policyholderMessage ?? "Please re-upload a clearer document.") 
      : undefined,
  }));

  // Get receipts for this invite
  const receipts = await findManyReceipts<ReceiptRecord>("receipts", {
    where: { inviteId: invite.id },
    orderBy: { column: "createdAt", ascending: false },
    limit: 3,
  });

  // Expose only receipt numbers (not artifact ids)
  const receiptNumbers = (receipts || []).map(r => r.receiptNumber);

  return NextResponse.json({
    ok: true,
    policyholder: `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Policyholder",
    documents: docStatuses,
    receipts: receiptNumbers,
  });
}

