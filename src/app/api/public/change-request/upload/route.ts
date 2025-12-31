// src/app/api/public/change-request/upload/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/invites";
import { putObject } from "@/lib/storage";
import { auditLog } from "@/lib/audit";
import {
  ChangeRequestStatus,
  DocumentClassificationStatus,
  DocumentSensitivity,
  UploaderType,
} from "@prisma/client";
import { rateLimit, clientIp } from "@/lib/security/rateLimit";
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
    return { sensitivityLevel: DocumentSensitivity.S4_HIGHLY_SENSITIVE, gov: true, tax: false, legal: false };
  }
  if (docType.startsWith("TAX_")) {
    return { sensitivityLevel: DocumentSensitivity.S4_HIGHLY_SENSITIVE, gov: false, tax: true, legal: false };
  }
  if (["COURT_FILING", "DEMAND_LETTER", "CLAIM_SUMMARY"].includes(docType)) {
    return { sensitivityLevel: DocumentSensitivity.S5_LEGAL_CASE, gov: false, tax: false, legal: true };
  }
  if (["POLICY", "BENEFICIARY_DOC"].includes(docType)) {
    return { sensitivityLevel: DocumentSensitivity.S3_CONFIDENTIAL, gov: false, tax: false, legal: false };
  }
  return { sensitivityLevel: DocumentSensitivity.S2_INTERNAL, gov: false, tax: false, legal: false };
}

export async function POST(req: Request) {
  // Rate limiting
  const ip = clientIp(req);
  const rl = rateLimit(`upload:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

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
  const cr = await prisma.change_requests.findUnique({
    where: { tokenHash },
    include: { clients: true },
  });
  if (!cr) return NextResponse.json({ error: "Change request invalid" }, { status: 403 });
  if (cr.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "Expired" }, { status: 403 });
  if (cr.submissionCount >= cr.maxSubmissions) return NextResponse.json({ error: "Used" }, { status: 403 });

  const docType = parseDocType(docTypeRaw);
  const c = classify(docType);

  // Version grouping: group by (clientId + docType)
  // This ensures "latest" supersedes old ones.
  const versionGroupId = `${cr.clientId}:${docType}`;

  const prevLatest = await prisma.documents.findFirst({
    where: { clientId: cr.clientId, versionGroupId: versionGroupId, supersededAt: null },
    orderBy: { versionNumber: "desc" },
  });
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

  const doc = await prisma.documents.create({
    data: {
      id: crypto.randomUUID(),
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
      versionGroupId: versionGroupId,
      versionNumber: nextVersion,
      extractedData: { received: true },
    },
  });

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

