// src/app/api/public/change-request/submit/route.ts
import { NextResponse } from "next/server";
;
import { hashToken } from "@/lib/invites";
import { auditLog } from "@/lib/audit";
import { makeReceiptNumber } from "@/lib/security";
import { makeChangeReceiptPdf } from "@/lib/pdf/changeReceipt";
import { putObject } from "@/lib/storage";
import { sendEmail } from "@/lib/email";
import { ChangeRequestStatus, UploaderType, DocumentClassificationStatus } from "@/lib/db/enums";
import { requiredDocTypesForChangeRequest } from "@/lib/rules/requiredDocs";
import { rateLimit, getClientIp } from "@/lib/security/rateLimit";

const ArtifactType = {
  RECEIPT_PDF: "RECEIPT_PDF",
} as const;

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
function labelRequestType(rt: string) {
  return rt.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function friendlyStatus(cs: string) {
  if (cs === DocumentClassificationStatus.APPROVED || cs === DocumentClassificationStatus.AUTO_ACCEPTED) return "Accepted";
  if (cs === DocumentClassificationStatus.NEEDS_REVIEW) return "Pending Review";
  return "Received";
}

export async function POST(req: Request) {
  // Rate limiting
  const ip = getClientIp(req);
  const rl = rateLimit(`submit:${ip}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string") return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const tokenHash = hashToken(token);
  const { findUnique: findUniqueChangeRequest, findUnique: findUniqueClient, update: updateChangeRequest, getDb } = await import("@/lib/db");
  
  type ChangeRequestRecord = {
    id: string;
    tokenHash: string;
    expiresAt: string | Date;
    submissionCount: number;
    maxSubmissions: number;
    clientId: string;
    requestType: string;
    note: string | null;
    status: string;
  };
  
  type ClientRecord = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  
  const cr = await findUniqueChangeRequest<ChangeRequestRecord>("change_requests", { tokenHash });
  
  if (!cr) return NextResponse.json({ error: "Invalid" }, { status: 403 });
  const expiresAt = typeof cr.expiresAt === 'string' ? new Date(cr.expiresAt) : cr.expiresAt;
  if (expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "Expired" }, { status: 403 });
  if (cr.submissionCount >= cr.maxSubmissions) return NextResponse.json({ error: "Used" }, { status: 403 });
  
  // Fetch client separately
  const client = await findUniqueClient<ClientRecord>("clients", { id: cr.clientId });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  
  // Fetch documents separately
  const db = getDb();
  const { data: docsData } = await db
    .from("documents")
    .select("*")
    .eq("changeRequestId", cr.id)
    .order("createdAt", { ascending: true });
  
  const documents = (docsData || []) as Array<{
    fileType: string;
    classificationStatus: string;
  }>;

  // Required docs validation
  const required = requiredDocTypesForChangeRequest(cr.requestType);
  const hasAny = (types: string[]) => documents.some(d => types.includes(d.fileType));
  const missing: string[] = [];

  for (const dt of required) {
    if (dt === "TAX_W9" || dt === "TAX_1040" || dt === "TAX_OTHER") {
      if (!hasAny(["TAX_W9", "TAX_1040", "TAX_OTHER"])) {
        missing.push("Tax Document");
      }
      continue;
    }
    if (dt === "DRIVERS_LICENSE" || dt === "PASSPORT") {
      // ID update: at least one ID doc
      if (!hasAny(["DRIVERS_LICENSE", "PASSPORT"])) missing.push("Government ID");
      continue;
    }
    if (!documents.some(d => d.fileType === dt)) {
      missing.push(dt);
    }
  }

  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required document(s): ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  await updateChangeRequest("change_requests", { id: cr.id }, {
    submissionCount: cr.submissionCount + 1,
    status: ChangeRequestStatus.SUBMITTED,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>);

  await auditLog({
    actorType: UploaderType.POLICYHOLDER,
    actorId: null,
    clientId: cr.clientId,
    inviteId: null,
    action: "CHANGE_REQUEST_SUBMITTED",
    metadata: { changeRequestId: cr.id, requestType: cr.requestType },
  });

  const receiptNumber = makeReceiptNumber();
  const clientName = `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Policyholder";

  const items = documents.map(d => ({
    docTypeLabel: labelDocType(d.fileType),
    statusLabel: friendlyStatus(d.classificationStatus),
  }));

  const pdfBuf = await makeChangeReceiptPdf({
    clientName,
    receiptNumber,
    receivedAt: new Date(),
    requestTypeLabel: labelRequestType(cr.requestType),
    items,
    note: cr.note ?? null,
  });

  const artifactKey = `private/artifacts/${cr.clientId}/change-${cr.id}-receipt-${receiptNumber}.pdf`;
  const { sha256: _sha256 } = await putObject({ key: artifactKey, body: pdfBuf, contentType: "application/pdf" });

  const { create: createDb, update: updateChangeRequest2 } = await import("@/lib/db");
  const { randomUUID } = await import("crypto");
  
  const artifact = await createDb("artifacts", {
    id: randomUUID(),
    type: ArtifactType.RECEIPT_PDF,
    clientId: cr.clientId,
    fileName: `HeirVault-Change-Receipt-${receiptNumber}.pdf`,
    filePath: artifactKey,
    fileSize: pdfBuf.length,
    mimeType: "application/pdf",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>) as { id: string };

  await updateChangeRequest2("change_requests", { id: cr.id }, {
    receiptArtifactId: artifact.id,
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>);

  await sendEmail({
    to: client.email!,
    subject: "Change Request Receipt",
    html: `
      <p>Your change request has been received.</p>
      <p><b>Receipt Number:</b> ${receiptNumber}</p>
      <p>Keep this receipt for your records.</p>
    `,
    attachments: [{ filename: `HeirVault-Change-Receipt-${receiptNumber}.pdf`, content: pdfBuf }],
  });

  await auditLog({
    actorType: UploaderType.SYSTEM,
    actorId: null,
    clientId: cr.clientId,
    inviteId: null,
    action: "CHANGE_RECEIPT_SENT",
    metadata: { changeRequestId: cr.id, receiptNumber },
  });

  // Kick off OCR job (best effort)
  fetch(`${process.env.APP_URL || "http://localhost:3000"}/api/jobs/process-docs`, { method: "POST" }).catch(() => {});

  return NextResponse.json({ ok: true, receipt: "SENT" });
}

