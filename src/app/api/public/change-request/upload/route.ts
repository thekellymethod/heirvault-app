// src/app/api/public/change-request/upload/route.ts
import { NextResponse } from "next/server";
;
import { hashToken } from "@/lib/invites";
import { putObject } from "@/lib/storage";
import { auditLog } from "@/lib/audit";
import {
  DocumentClassificationStatus,
  DocumentSensitivity,
  UploaderType,
} from "@/lib/db/enums";
import { rateLimit, getClientIp } from "@/lib/security/rateLimit";
import { validateUpload } from "@/lib/security/uploads";
import crypto from "crypto";

export const runtime = "nodejs";

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
  return { sensitivityLevel: DocumentSensitivity.PUBLIC, gov: false, tax: false, legal: false };
}

export async function POST(req: Request) {
  // Rate limiting
  const ip = getClientIp(req);
  const rl = rateLimit(`upload:${ip}`, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const form = await req.formData();
  const token = form.get("token");
  const docTypeRaw = form.get("docType");
  const file = form.get("file");

  if (typeof token !== "string") return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  if (typeof docTypeRaw !== "string") return NextResponse.json({ error: "Invalid docType" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  // File validation
  try {
    validateUpload(file, { maxBytes: 15 * 1024 * 1024 }); // 15MB
  } catch (e) {
    const error = e as Error;
    return NextResponse.json({ error: error.message || "Invalid file" }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const { findUnique: findUniqueChangeRequest, findUnique: findUniqueClient, getDb, create: createDb } = await import("@/lib/db");
  
  type ChangeRequestRecord = {
    id: string;
    tokenHash: string;
    expiresAt: string | Date;
    submissionCount: number;
    maxSubmissions: number;
    clientId: string;
  };
  
  type ClientRecord = {
    id: string;
    orgId: string | null;
  };
  
  const cr = await findUniqueChangeRequest<ChangeRequestRecord>("change_requests", { tokenHash });
  if (!cr) return NextResponse.json({ error: "Change request invalid" }, { status: 403 });
  const expiresAt = typeof cr.expiresAt === 'string' ? new Date(cr.expiresAt) : cr.expiresAt;
  if (expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "Expired" }, { status: 403 });
  if (cr.submissionCount >= cr.maxSubmissions) return NextResponse.json({ error: "Used" }, { status: 403 });
  
  // Fetch client separately
  const client = await findUniqueClient<ClientRecord>("clients", { id: cr.clientId });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const docType = parseDocType(docTypeRaw);
  const c = classify(docType);

  // Check tier-based upload permission
  const { checkUploadPermission } = await import("@/lib/documents/upload-guard");
  const permissionError = await checkUploadPermission(
    docType,
    file.name,
    "/api/public/change-request/upload",
    client.orgId || null,
    cr.clientId,
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

  // Version grouping: group by (clientId + docType)
  // This ensures "latest" supersedes old ones.
  const versionGroupId = `${cr.clientId}:${docType}`;

  const db = getDb();
  const { data: prevDocsData } = await db
    .from("documents")
    .select("*")
    .eq("clientId", cr.clientId)
    .eq("versionGroupId", versionGroupId)
    .is("supersededAt", null)
    .order("versionNumber", { ascending: false })
    .limit(1);
  
  const prevLatest = prevDocsData && prevDocsData.length > 0 ? prevDocsData[0] as { versionNumber: number } : null;
  const nextVersion = (prevLatest?.versionNumber ?? 0) + 1;

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeId = crypto.randomBytes(10).toString("hex");
  const storageKey = `private/${c.sensitivityLevel.toLowerCase()}/${cr.clientId}/cr-${safeId}.${ext}`;

  const { sha256 } = await putObject({
    key: storageKey,
    body: buf,
    contentType: file.type || "application/octet-stream",
  });

  // Map fileType to document category
  const { getDocumentCategory } = await import("@/lib/documents/taxonomy");
  const documentCategory = getDocumentCategory(docType, null);

  const { randomUUID } = await import("crypto");
  const _doc = await createDb("documents", {
    id: randomUUID(),
    clientId: cr.clientId,
    changeRequestId: cr.id,
    fileName: file.name,
    fileType: docType, // Stored as string in schema
    fileSize: buf.length,
    filePath: storageKey,
    mimeType: file.type || "application/octet-stream",
    documentHash: sha256,
    sensitivityLevel: c.sensitivityLevel,
    containsGovId: c.gov,
    containsTaxData: c.tax,
    containsCaseData: c.legal,
    classificationStatus: DocumentClassificationStatus.PENDING_OCR,
    uploadedVia: "CHANGE_REQUEST_UPLOAD",
    documentCategory, // Store category if mapped
    versionGroupId: versionGroupId,
    versionNumber: nextVersion,
    extractedData: { received: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>);

  await auditLog({
    actorType: UploaderType.POLICYHOLDER,
    actorId: null,
    clientId: cr.clientId,
    inviteId: null,
    action: "CHANGE_DOC_UPLOADED",
    metadata: { changeRequestId: cr.id, docType, sensitivityLevel: c.sensitivityLevel, versionNumber: nextVersion },
  });

  return NextResponse.json({ ok: true, status: "RECEIVED" }, { status: 200 });
}

