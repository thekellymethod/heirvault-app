// src/app/api/public/intake/submit/route.ts
import { NextResponse } from "next/server";
import { hashToken } from "@/lib/invites";
import { loadPendingClientInviteWithClient } from "@/lib/invites/clientInviteGate";
import { auditLog } from "@/lib/audit";
import { makeReceiptNumber } from "@/lib/security";
import { makeReceiptPdf } from "@/lib/pdf/receipt";
import { putObject } from "@/lib/storage";
import { sendEmail } from "@/lib/email";
import { DocumentClassificationStatus } from "@/lib/db/enums";
import { bandFromScore } from "@/lib/confidence";
import { intakeRules, requiredDocTypesForInvite } from "@/lib/rules/requiredDocs";
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

export async function POST(req: Request) {
  // Rate limiting
  const ip = getClientIp(req);
  const rl = rateLimit(`submit:${ip}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string") return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const tokenHash = hashToken(token);
  const gate = await loadPendingClientInviteWithClient(tokenHash);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { invite, client } = gate;

  if (!invite.createdAt) {
    return NextResponse.json({ error: "Invite misconfigured" }, { status: 500 });
  }

  const { findMany: findManyPolicies, getDb } = await import("@/lib/db");

  // Get documents for this invite
  const db = getDb();
  const { data: docsData } = await db
    .from("documents")
    .select("*")
    .eq("clientId", invite.clientId)
    .eq("uploadedVia", "CLIENT_INVITE_UPLOAD")
    .gte("createdAt", invite.createdAt);
  
  const documents = (docsData || []) as Array<{
    fileType: string;
    classificationStatus: string;
    confidenceScore: number | null;
  }>;

  // Get expected policy to determine required docs
  const policies = await findManyPolicies("policies", {
    where: { clientId: invite.clientId },
    orderBy: { column: "createdAt", ascending: false },
    limit: 1,
  });
  const expectedPolicy = policies && policies.length > 0 ? policies[0] : null;

  // Determine intake rules
  const rules = intakeRules({
    requireGovId: true,
    requireTax: false, // Can be set based on invite metadata if needed
    beneficiariesExpected: (expectedPolicy as { expectedBeneficiaryCount?: number | null } | null)?.expectedBeneficiaryCount ?? null,
  });

  const required = requiredDocTypesForInvite(rules);
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
      // ID: at least one ID doc
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

  // Count submissions
  const { update: updateInvite } = await import("@/lib/db");
  await updateInvite("client_invites", { id: invite.id }, {
    submissionCount: invite.submissionCount + 1,
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>);

  await auditLog({
    actorType: "POLICYHOLDER",
    actorId: null,
    clientId: invite.clientId,
    inviteId: invite.id,
    action: "INTAKE_SUBMITTED",
    metadata: {},
  });

  // NOTE: The OCR/scoring worker is separate; at submit time we generate a receipt
  // based on current statuses. Later review/auto-accept happens asynchronously.
  const receiptNumber = makeReceiptNumber();
  const clientName = `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Policyholder";

  const items = documents.map(d => {
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
  const { sha256: _sha256 } = await putObject({ key: artifactKey, body: pdfBuf, contentType: "application/pdf" });

  const { create: createArtifact, create: createReceipt } = await import("@/lib/db");
  const { randomUUID } = await import("crypto");
  
  const art = await createArtifact("artifacts", {
    id: randomUUID(),
    type: ArtifactType.RECEIPT_PDF,
    clientId: invite.clientId,
    inviteId: invite.id,
    fileName: `HeirVault-Receipt-${receiptNumber}.pdf`,
    filePath: artifactKey,
    fileSize: pdfBuf.length,
    mimeType: "application/pdf",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>) as { id: string };

  await createReceipt("receipts", {
    id: randomUUID(),
    clientId: invite.clientId,
    inviteId: invite.id,
    receiptNumber: receiptNumber,
    artifactId: art.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>);

  await auditLog({
    actorType: "SYSTEM",
    actorId: null,
    clientId: invite.clientId,
    inviteId: invite.id,
    action: "RECEIPT_PDF_STORED",
    metadata: { receiptNumber },
  });

  await sendEmail({
    to: client.email!,
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
    metadata: { to: client.email, receiptNumber },
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
