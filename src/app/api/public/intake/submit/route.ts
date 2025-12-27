// src/app/api/public/intake/submit/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/invites";
import { auditLog } from "@/lib/audit";
import { makeReceiptNumber } from "@/lib/security";
import { makeReceiptPdf } from "@/lib/pdf/receipt";
import { putObject } from "@/lib/storage";
import { sendEmail } from "@/lib/email";
import { ArtifactType, ClientInviteStatus, DocumentClassificationStatus } from "@prisma/client";
import { bandFromScore } from "@/lib/confidence";
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

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string") return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const tokenHash = hashToken(token);
  const invite = await prisma.client_invites.findUnique({
    where: { tokenHash },
    include: { clients: true },
  });

  if (!invite || invite.status !== ClientInviteStatus.ACTIVE) return NextResponse.json({ error: "Invite invalid" }, { status: 403 });
  if (invite.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "Invite expired" }, { status: 403 });
  if (invite.submissionCount >= invite.maxSubmissions) return NextResponse.json({ error: "Invite used" }, { status: 403 });

  // Count submissions
  await prisma.client_invites.update({
    where: { id: invite.id },
    data: { submissionCount: { increment: 1 } },
  });

  await auditLog({
    actorType: "POLICYHOLDER",
    actorId: null,
    clientId: invite.clientId,
    inviteId: invite.id,
    action: "INTAKE_SUBMITTED",
    metadata: {},
  });

  // Pull docs for this invite (documents uploaded via this invite)
  const docs = await prisma.documents.findMany({
    where: { 
      clientId: invite.clientId,
      uploadedVia: "CLIENT_INVITE_UPLOAD",
      createdAt: { gte: invite.createdAt },
    },
    orderBy: { createdAt: "asc" },
  });

  // NOTE: The OCR/scoring worker is separate; at submit time we generate a receipt
  // based on current statuses. Later review/auto-accept happens asynchronously.
  const receiptNumber = makeReceiptNumber();
  const clientName = `${invite.clients.firstName ?? ""} ${invite.clients.lastName ?? ""}`.trim() || "Policyholder";

  const items = docs.map(d => {
    // Policyholder-safe status
    let statusLabel = "Received";
    if (d.classificationStatus === DocumentClassificationStatus.APPROVED || d.classificationStatus === DocumentClassificationStatus.AUTO_ACCEPTED) {
      statusLabel = "Accepted";
    } else if (d.classificationStatus === DocumentClassificationStatus.NEEDS_REVIEW) {
      statusLabel = "Pending Review";
    }
    // If scored, you may show band only (not score)
    if (typeof d.confidenceScore === "number") {
      const band = bandFromScore(d.confidenceScore);
      statusLabel = band === "HIGH" ? "Accepted" : "Pending Review";
    }
    return { docTypeLabel: labelDocType(d.fileType), statusLabel };
  });

  const overallStatusLabel =
    items.some(i => i.statusLabel === "Pending Review")
      ? "Pending attorney/admin review (some items require verification)."
      : "Received. Processing will complete automatically if verification is successful.";

  const pdfBuf = await makeReceiptPdf({
    clientName,
    receiptNumber,
    receivedAt: new Date(),
    items,
    overallStatusLabel,
  });

  const artifactKey = `private/artifacts/${invite.clientId}/${invite.id}-receipt-${receiptNumber}.pdf`;
  const { sha256 } = await putObject({ key: artifactKey, body: pdfBuf, contentType: "application/pdf" });

  const art = await prisma.artifacts.create({
    data: {
      id: crypto.randomUUID(),
      type: ArtifactType.RECEIPT_PDF,
      clientId: invite.clientId,
      inviteId: invite.id,
      fileName: `HeirVault-Receipt-${receiptNumber}.pdf`,
      filePath: artifactKey,
      fileSize: pdfBuf.length,
      mimeType: "application/pdf",
    },
  });

  await prisma.receipts.create({
    data: {
      id: crypto.randomUUID(),
      clientId: invite.clientId,
      inviteId: invite.id,
      receiptNumber: receiptNumber,
      artifactId: art.id,
    },
  });

  await auditLog({
    actorType: "SYSTEM",
    actorId: null,
    clientId: invite.clientId,
    inviteId: invite.id,
    action: "RECEIPT_PDF_STORED",
    metadata: { receiptNumber },
  });

  await sendEmail({
    to: invite.clients.email!,
    subject: "Submission Receipt",
    html: `
      <p>Your submission has been received.</p>
      <p><b>Receipt Number:</b> ${receiptNumber}</p>
      <p>Keep this receipt for your records. Future changes may require verification.</p>
    `,
    attachments: [{ filename: `HeirVault-Receipt-${receiptNumber}.pdf`, content: pdfBuf }],
  });

  await auditLog({
    actorType: "SYSTEM",
    actorId: null,
    clientId: invite.clientId,
    inviteId: invite.id,
    action: "RECEIPT_EMAIL_SENT",
    metadata: { to: invite.clients.email, receiptNumber },
  });

  // Fire-and-forget kickoff (do not block policyholder)
  fetch(`${process.env.APP_URL || "http://localhost:3000"}/api/jobs/process-docs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }).catch(() => {
    // Silently fail - job will be picked up by cron if this fails
  });

  // Policyholder-safe response: no internal references
  return NextResponse.json({ ok: true, receipt: "SENT" }, { status: 200 });
}
