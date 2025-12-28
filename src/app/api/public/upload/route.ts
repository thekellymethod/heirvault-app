// src/app/api/public/upload/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/invites";
import { putObject } from "@/lib/storage";
import { auditLog } from "@/lib/audit";
import { ClientInviteStatus, DocumentClassificationStatus, DocumentSensitivity } from "@prisma/client";
import { rateLimit, clientIp } from "@/lib/security/rateLimit";
import { validateUpload } from "@/lib/security/uploads";
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
  const invite = await prisma.client_invites.findUnique({
    where: { tokenHash },
    include: { clients: true },
  });
  if (!invite || invite.status !== ClientInviteStatus.ACTIVE) return NextResponse.json({ error: "Invite invalid" }, { status: 403 });
  if (invite.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "Invite expired" }, { status: 403 });
  if (invite.submissionCount >= invite.maxSubmissions) return NextResponse.json({ error: "Invite used" }, { status: 403 });

  const docType = parseDocType(docTypeRaw);
  const c = classify(docType);

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeId = crypto.randomBytes(10).toString("hex"); // not a DB id
  const storageKey = `private/${c.sensitivityLevel.toLowerCase()}/${invite.clientId}/${safeId}.${ext}`;

  const { sha256 } = await putObject({
    key: storageKey,
    body: buf,
    contentType: file.type || "application/octet-stream",
  });

  const doc = await prisma.documents.create({
    data: {
      id: crypto.randomUUID(),
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
      extractedData: { received: true },
    },
  });

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
