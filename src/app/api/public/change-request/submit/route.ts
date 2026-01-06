// src/app/api/public/change-request/submit/route.ts
import { NextResponse } from "next/server";
;
import { hashToken } from "@/lib/invites";
import { auditLog } from "@/lib/audit";
import { makeReceiptNumber } from "@/lib/security";
import { makeChangeReceiptPdf } from "@/lib/pdf/changeReceipt";
import { putObject } from "@/lib/storage";
import { sendEmail } from "@/lib/email";
import { ArtifactType, ChangeRequestStatus, UploaderType, DocumentClassificationStatus } from "@prisma/client";
import { requiredDocTypesForChangeRequest } from "@/lib/rules/requiredDocs";
import { rateLimit, clientIp } from "@/lib/security/rateLimit";
import crypto from "crypto";

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
function friendlyStatus(cs: DocumentClassificationStatus) {
  if (cs === DocumentClassificationStatus.APPROVED || cs === DocumentClassificationStatus.AUTO_ACCEPTED) return "Accepted";
  if (cs === DocumentClassificationStatus.NEEDS_REVIEW) return "Pending Review";
  return "Received";
}

export async function POST(req: Request) {
  // Rate limiting
  const ip = clientIp(req);
  const rl = rateLimit(`submit:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string") return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const tokenHash = hashToken(token);
  const cr = await prisma.change_requests.findUnique({
    where: { tokenHash },
    include: { clients: true, documents: { orderBy: { createdAt: "asc" } } },
  });

  if (!cr) return NextResponse.json({ error: "Invalid" }, { status: 403 });
  if (cr.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "Expired" }, { status: 403 });
  if (cr.submissionCount >= cr.maxSubmissions) return NextResponse.json({ error: "Used" }, { status: 403 });

  // Required docs validation
  const required = requiredDocTypesForChangeRequest(cr.requestType);
  const hasAny = (types: string[]) => cr.documents.some(d => types.includes(d.fileType));
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
    if (!cr.documents.some(d => d.fileType === dt)) {
      missing.push(dt);
    }
  }

  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required document(s): ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  await prisma.change_requests.update({
    where: { id: cr.id },
    data: {
      submissionCount: { increment: 1 },
      status: ChangeRequestStatus.SUBMITTED,
      submittedAt: new Date(),
    },
  });

  await auditLog({
    actorType: UploaderType.POLICYHOLDER,
    actorId: null,
    clientId: cr.clientId,
    inviteId: null,
    action: "CHANGE_REQUEST_SUBMITTED",
    metadata: { changeRequestId: cr.id, requestType: cr.requestType },
  });

  const receiptNumber = makeReceiptNumber();
  const clientName = `${cr.clients.firstName ?? ""} ${cr.clients.lastName ?? ""}`.trim() || "Policyholder";

  const items = cr.documents.map(d => ({
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

  const artifact = await prisma.artifacts.create({
    data: {
      id: crypto.randomUUID(),
      type: ArtifactType.RECEIPT_PDF,
      clientId: cr.clientId,
      fileName: `HeirVault-Change-Receipt-${receiptNumber}.pdf`,
      filePath: artifactKey,
      fileSize: pdfBuf.length,
      mimeType: "application/pdf",
    },
  });

  await prisma.change_requests.update({
    where: { id: cr.id },
    data: { receiptArtifactId: artifact.id },
  });

  await sendEmail({
    to: cr.clients.email!,
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

