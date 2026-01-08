// src/app/api/public/change-request/status/route.ts
import { NextResponse } from "next/server";
;
import { hashToken } from "@/lib/invites";
import { ChangeRequestStatus, DocumentClassificationStatus } from "@/lib/db/enums";

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
  const { findUnique: findUniqueChangeRequest, findUnique: findUniqueClient, findUnique: findUniqueArtifact, getDb } = await import("@/lib/db");
  
  type ChangeRequestRecord = {
    id: string;
    tokenHash: string;
    status: string;
    expiresAt: string;
    clientId: string;
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
  
  type ArtifactRecord = {
    metadata: Record<string, unknown> | null;
  };
  
  const cr = await findUniqueChangeRequest<ChangeRequestRecord>("change_requests", { tokenHash });

  if (!cr) return NextResponse.json({ ok: false }, { status: 200 });

  // Only allow view while active
  if (cr.status !== ChangeRequestStatus.SUBMITTED && cr.status !== ChangeRequestStatus.NEEDS_REVIEW) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  
  const expiresAt = typeof cr.expiresAt === 'string' ? new Date(cr.expiresAt) : cr.expiresAt;
  if (expiresAt.getTime() < Date.now()) return NextResponse.json({ ok: false }, { status: 200 });

  // Fetch client separately
  const client = await findUniqueClient<ClientRecord>("clients", { id: cr.clientId });
  if (!client) return NextResponse.json({ ok: false }, { status: 200 });

  // Get documents for this change request
  const db = getDb();
  const { data: docsData } = await db
    .from("documents")
    .select("*")
    .eq("changeRequestId", cr.id)
    .order("createdAt", { ascending: true });
  
  const docs = (docsData || []) as DocumentRecord[];

  const docStatuses = docs.map((d) => ({
    type: labelDocType(d.fileType),
    status: friendlyPipeline({ 
      processingState: d.processingState ?? undefined, 
      classificationStatus: d.classificationStatus 
    }),
    message: d.classificationStatus === DocumentClassificationStatus.REJECTED 
      ? (d.policyholderMessage ?? "Please re-upload a clearer document.") 
      : undefined,
  }));

  // Get receipt artifact if exists
  const receiptArtifact = await findUniqueArtifact<ArtifactRecord>("artifacts", { changeRequestId: cr.id });
  const receiptNumber = ((receiptArtifact?.metadata as Record<string, unknown> | null)?.receiptNumber as string | undefined) ?? null;

  return NextResponse.json({
    ok: true,
    policyholder: `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Policyholder",
    documents: docStatuses,
    receipt: receiptNumber ? [receiptNumber] : [],
  });
}

