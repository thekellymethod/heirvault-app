import "server-only";

import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { normalizeUuid, uuidSchema } from "@/lib/validation/uuids";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  HEIRVAULT_POLICY_DOCUMENT_MAX_BYTES,
  POLICY_DOCUMENT_ALLOWED_MIMES,
  validatePolicyDocumentUploadFile,
} from "@/lib/storage/policyDocumentUploadRules";

/** Private bucket; never set public. */
export const HEIRVAULT_DOCS_BUCKET = "heirvault-docs" as const;

/** Default signed URL TTL (seconds). */
export const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 600;

/** Slug for the fourth path segment (e.g. policy-document, beneficiary-form, generated). */
const documentTypeSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9-]*$/i, "type must be a slug (letters, numbers, hyphen)");

const fileNameSchema = z
  .string()
  .min(1)
  .max(255)
  .refine((n) => !n.includes("/") && !n.includes("\\") && !n.includes(".."), "fileName must not contain path segments");

export type PolicyDocumentRow = {
  id: string;
  firm_id: string;
  estate_id: string;
  policy_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

function sanitizeFileName(name: string): string {
  const t = name.replace(/[/\\]/g, "_").replace(/\.\./g, "_").trim();
  return t.length > 0 ? t : "file";
}

/**
 * Deterministic object path (and file_path column) relative to bucket root:
 * `{firmId}/{estateId}/{policyId}/{type}/{fileName}` (UUIDs lowercased).
 */
export function buildPolicyDocumentStoragePath(input: {
  firmId: string;
  estateId: string;
  policyId: string;
  type: string;
  fileName: string;
}): string {
  const firmId = normalizeUuid(input.firmId);
  const estateId = normalizeUuid(input.estateId);
  const policyId = normalizeUuid(input.policyId);
  const type = documentTypeSchema.parse(input.type);
  const fileName = fileNameSchema.parse(sanitizeFileName(input.fileName));
  return `${firmId}/${estateId}/${policyId}/${type}/${fileName}`;
}

function byteLength(body: File | Blob | ArrayBuffer): number {
  if (body instanceof ArrayBuffer) return body.byteLength;
  return body.size;
}

function validateNonFileUploadBody(
  body: Blob | ArrayBuffer,
  mimeType: string | null | undefined
): { mimeType: string; sizeBytes: number } {
  const sizeBytes = byteLength(body);
  if (sizeBytes <= 0) {
    throw new Error("Empty body not allowed");
  }
  if (sizeBytes > HEIRVAULT_POLICY_DOCUMENT_MAX_BYTES) {
    throw new Error(`Body exceeds maximum size of ${HEIRVAULT_POLICY_DOCUMENT_MAX_BYTES} bytes`);
  }
  const m = (mimeType ?? "").trim().toLowerCase();
  if (!m || !POLICY_DOCUMENT_ALLOWED_MIMES.has(m)) {
    throw new Error("Unsupported or missing MIME type for non-File upload (allowed: PDF, JPEG, PNG)");
  }
  return { mimeType: m, sizeBytes };
}

/**
 * Upload bytes to `heirvault-docs`, then insert `policy_documents`.
 * Uses service role (server); RLS does not apply. Client-side flows should use Supabase Auth JWT + same path rules.
 */
export async function uploadPolicyDocument(input: {
  firmId: string;
  estateId: string;
  policyId: string;
  type: string;
  fileName: string;
  body: File | Blob | ArrayBuffer;
  mimeType?: string | null;
  uploadedBy?: string | null;
}): Promise<PolicyDocumentRow> {
  const firmId = normalizeUuid(input.firmId);
  const estateId = normalizeUuid(input.estateId);
  const policyId = normalizeUuid(input.policyId);
  const type = documentTypeSchema.parse(input.type);
  const fileName = fileNameSchema.parse(sanitizeFileName(input.fileName));
  const filePath = `${firmId}/${estateId}/${policyId}/${type}/${fileName}`;

  let sizeBytes: number;
  let mimeType: string | null;
  if (input.body instanceof File) {
    const v = validatePolicyDocumentUploadFile(input.body);
    sizeBytes = v.sizeBytes;
    mimeType = v.mimeType;
  } else {
    const v = validateNonFileUploadBody(input.body, input.mimeType ?? null);
    sizeBytes = v.sizeBytes;
    mimeType = v.mimeType;
  }

  const uploadedBy = input.uploadedBy ? uuidSchema.parse(input.uploadedBy) : null;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(HEIRVAULT_DOCS_BUCKET)
    .upload(filePath, input.body, {
      upsert: false,
      contentType: mimeType ?? undefined,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data, error: insertError } = await supabaseAdmin
    .from("policy_documents")
    .insert({
      firm_id: firmId,
      estate_id: estateId,
      policy_id: policyId,
      file_path: filePath,
      file_name: fileName,
      file_type: type,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();

  if (insertError || !data) {
    await supabaseAdmin.storage.from(HEIRVAULT_DOCS_BUCKET).remove([filePath]).catch(() => {});
    throw new Error(`policy_documents insert failed: ${insertError?.message ?? "unknown"}`);
  }

  return data as PolicyDocumentRow;
}

function clampSignedUrlExpiry(seconds?: number): number {
  return Math.min(Math.max(seconds ?? DEFAULT_SIGNED_URL_EXPIRY_SECONDS, 60), 60 * 60 * 24 * 7);
}

export type PolicyDocumentSignedUrlResult = {
  signedUrl: string;
  expiresInSeconds: number;
};

/**
 * Signed URL for a stored object. Server-side; uses service role.
 * `expiresInSeconds` defaults to {@link DEFAULT_SIGNED_URL_EXPIRY_SECONDS}.
 */
export async function createPolicyDocumentSignedUrl(input: {
  filePath: string;
  expiresInSeconds?: number;
}): Promise<PolicyDocumentSignedUrlResult> {
  const filePath = z.string().min(1).max(2048).parse(input.filePath);
  const expiresInSeconds = clampSignedUrlExpiry(input.expiresInSeconds);

  const { data, error } = await supabaseAdmin.storage
    .from(HEIRVAULT_DOCS_BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message ?? "no URL"}`);
  }
  return { signedUrl: data.signedUrl, expiresInSeconds };
}

export async function getPolicyDocumentSignedUrl(input: {
  filePath: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { signedUrl } = await createPolicyDocumentSignedUrl(input);
  return signedUrl;
}

/** Load path from `policy_documents` then issue a signed URL. */
export async function getPolicyDocumentSignedUrlById(input: {
  documentId: string;
  expiresInSeconds?: number;
}): Promise<{ signedUrl: string; filePath: string; expiresInSeconds: number }> {
  const id = uuidSchema.parse(input.documentId);
  const { data, error } = await supabaseAdmin.from("policy_documents").select("file_path").eq("id", id).maybeSingle();

  if (error || !data?.file_path) {
    throw new Error(`policy_documents row not found: ${error?.message ?? id}`);
  }

  const { signedUrl, expiresInSeconds } = await createPolicyDocumentSignedUrl({
    filePath: data.file_path as string,
    expiresInSeconds: input.expiresInSeconds,
  });
  return { signedUrl, filePath: data.file_path as string, expiresInSeconds };
}

/**
 * Remove object from storage then delete metadata row.
 * If storage removal fails, the DB row is left unchanged.
 * If storage succeeds and DB delete fails, logs a structured reconciliation event (object is gone).
 */
export async function deletePolicyDocument(documentId: string): Promise<void> {
  const id = uuidSchema.parse(documentId);

  const { data: row, error: selErr } = await supabaseAdmin
    .from("policy_documents")
    .select("id, file_path, firm_id, estate_id, policy_id")
    .eq("id", id)
    .maybeSingle();

  if (selErr || !row?.file_path) {
    throw new Error(`policy_documents not found: ${selErr?.message ?? id}`);
  }

  const filePath = row.file_path as string;

  const { error: rmErr } = await supabaseAdmin.storage.from(HEIRVAULT_DOCS_BUCKET).remove([filePath]);
  if (rmErr) {
    throw new Error(`Storage delete failed: ${rmErr.message}`);
  }

  const { error: delErr } = await supabaseAdmin.from("policy_documents").delete().eq("id", id);
  if (delErr) {
    const payload = {
      code: "POLICY_DOCUMENT_STORAGE_DELETED_DB_ROW_REMAINS",
      documentId: id,
      filePath,
      firmId: row.firm_id,
      estateId: row.estate_id,
      policyId: row.policy_id,
      dbError: delErr.message,
      hint: "Re-run scripts/reconcile-policy-documents-storage.ts; consider deleting the stale policy_documents row.",
    };
    console.error(`[heirvault-policy-documents] ${JSON.stringify(payload)}`);
    await auditLog({
      actorType: "SYSTEM",
      actorId: null,
      clientId: typeof row.estate_id === "string" ? row.estate_id : null,
      action: "POLICY_DOCUMENT_DB_DELETE_FAILED_AFTER_STORAGE",
      metadata: payload,
    }).catch(() => {});
    throw new Error(`policy_documents delete failed after storage object was removed: ${delErr.message}`);
  }
}
