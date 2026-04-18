// src/app/api/public/upload/route.ts
import { NextResponse } from "next/server";
import { hashToken } from "@/lib/invites";
import { loadPendingClientInviteWithClient } from "@/lib/invites/clientInviteGate";
import { putObject } from "@/lib/storage";
import { auditLog } from "@/lib/audit";
import { DocumentClassificationStatus, DocumentSensitivity } from "@/lib/db/enums";
import { getDocumentCategory } from "@/lib/documents/taxonomy";
// import { rateLimit, clientIp } from "@/lib/security/rateLimit";
// import { validateUpload } from "@/lib/security/uploads";
import crypto from "crypto";

// Document type mapping - adjust based on your actual enum
type DocType = "DRIVERS_LICENSE" | "PASSPORT" | "POLICY" | "BENEFICIARY_DOC" | "TAX_W9" | "TAX_1040" | "TAX_OTHER" | "COURT_FILING" | "DEMAND_LETTER" | "CLAIM_SUMMARY" | "OTHER";

function parseDocType(v: string): DocType {
  const up = String(v || "").toUpperCase();
  const validTypes: DocType[] = ["DRIVERS_LICENSE", "PASSPORT", "POLICY", "BENEFICIARY_DOC", "TAX_W9", "TAX_1040", "TAX_OTHER", "COURT_FILING", "DEMAND_LETTER", "CLAIM_SUMMARY", "OTHER"];
  if (validTypes.includes(up as DocType)) return up as DocType;
  return "OTHER";
}

function classify(docType: DocType) {
  if (docType === "DRIVERS_LICENSE" || docType === "PASSPORT") {
    return { sensitivityLevel: DocumentSensitivity.RESTRICTED, gov: true, tax: false, legal: false };
  }
  if (docType.startsWith("TAX_")) {
    return { sensitivityLevel: DocumentSensitivity.RESTRICTED, gov: false, tax: true, legal: false };
  }
  if (["COURT_FILING", "DEMAND_LETTER", "CLAIM_SUMMARY"].includes(docType)) {
    return { sensitivityLevel: DocumentSensitivity.RESTRICTED, gov: false, tax: false, legal: true };
  }
  if (["POLICY", "BENEFICIARY_DOC"].includes(docType)) {
    return { sensitivityLevel: DocumentSensitivity.CONFIDENTIAL, gov: false, tax: false, legal: false };
  }
  return { sensitivityLevel: DocumentSensitivity.CONFIDENTIAL, gov: false, tax: false, legal: false };
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const token = form.get("token");
  const docTypeRaw = form.get("docType");
  const file = form.get("file");

  if (typeof token !== "string") return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  if (typeof docTypeRaw !== "string") return NextResponse.json({ error: "Invalid docType" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const tokenHash = hashToken(token);
  const gate = await loadPendingClientInviteWithClient(tokenHash);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { invite, client } = gate;

  const { create: createDb } = await import("@/lib/db");
  const orgId = client.orgId ?? client.organizationId ?? null;

  const docType = parseDocType(docTypeRaw);
  const c = classify(docType);

  // Check tier-based upload permission
  const { checkUploadPermission } = await import("@/lib/documents/upload-guard");
  const permissionError = await checkUploadPermission(
    docType,
    file.name,
    "/api/public/upload",
    orgId,
    invite.clientId,
    null // Public upload, no user ID
  );

  if (permissionError) {
    return NextResponse.json(
      {
        error: "TIER_UPGRADE_REQUIRED",
        code: permissionError.code,
        requiredTier: permissionError.requiredTier,
        reason: permissionError.reason,
        message: `This document type requires ${permissionError.requiredTier === "ACTIVE_ESTATE" ? "Active Estate Operations" : "Firm-Wide Operations"} tier.`,
      },
      { status: 403 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeId = crypto.randomBytes(10).toString("hex"); // not a DB id
  const storageKey = `private/${c.sensitivityLevel.toLowerCase()}/${invite.clientId}/${safeId}.${ext}`;

  const { sha256 } = await putObject({
    key: storageKey,
    body: buf,
    contentType: file.type || "application/octet-stream",
  });

  // Map fileType to document category
  const documentCategory = getDocumentCategory(docType, null);

  const { randomUUID } = await import("crypto");
  const _doc = await createDb("documents", {
    id: randomUUID(),
    clientId: invite.clientId,
    fileName: file.name,
    fileType: docType,
    fileSize: buf.length,
    filePath: storageKey,
    mimeType: file.type || "application/octet-stream",
    documentHash: sha256,
    sensitivityLevel: c.sensitivityLevel,
    containsGovId: c.gov,
    containsTaxData: c.tax,
    containsCaseData: c.legal,
    classificationStatus: DocumentClassificationStatus.PENDING_OCR,
    uploadedVia: "CLIENT_INVITE_UPLOAD",
    documentCategory, // Store category if mapped
    extractedData: { received: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>);

  await auditLog({
    actorType: "POLICYHOLDER",
    actorId: null,
    clientId: invite.clientId,
    inviteId: invite.id,
    action: "DOC_UPLOADED",
    metadata: { docType, sensitivityLevel: c.sensitivityLevel },
  });

  // Policyholder-safe response: NO IDs
  return NextResponse.json({ ok: true, status: "RECEIVED" }, { status: 200 });
}
