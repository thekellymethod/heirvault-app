import "server-only";

import { HttpError } from "@/lib/permissions/guard";

/** Matches `storage.buckets.file_size_limit` for `heirvault-docs` (50 MiB). */
export const HEIRVAULT_POLICY_DOCUMENT_MAX_BYTES = 52_428_800;

/** Allowed Content-Type values for policy registry uploads (conservative default). */
export const POLICY_DOCUMENT_ALLOWED_MIMES = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function extensionMime(lowerName: string): string | null {
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  return null;
}

/**
 * Prefer the browser-reported type; if empty, infer a small allowlist from the file name.
 * Does not sniff bytes (add server-side scanning separately if required).
 */
export function normalizePolicyDocumentMimeType(file: File): string | null {
  const raw = (file.type ?? "").trim().toLowerCase();
  if (raw && POLICY_DOCUMENT_ALLOWED_MIMES.has(raw)) return raw;
  const fromName = extensionMime(file.name.trim().toLowerCase());
  return fromName;
}

/**
 * Validates an upload before any storage write: non-empty size, cap, MIME allowlist.
 * @throws HttpError 400 on rejection
 */
export function validatePolicyDocumentUploadFile(file: File): { mimeType: string; sizeBytes: number } {
  if (!(file instanceof File)) {
    throw new HttpError(400, "Expected a File");
  }
  if (file.size <= 0) {
    throw new HttpError(400, "Empty files are not allowed");
  }
  if (file.size > HEIRVAULT_POLICY_DOCUMENT_MAX_BYTES) {
    throw new HttpError(
      400,
      `File exceeds maximum size of ${HEIRVAULT_POLICY_DOCUMENT_MAX_BYTES} bytes`
    );
  }

  const mimeType = normalizePolicyDocumentMimeType(file);
  if (!mimeType) {
    throw new HttpError(
      400,
      "Unsupported file type. Allowed: PDF, JPEG, PNG (set a correct Content-Type or use a .pdf/.jpg/.jpeg/.png name)."
    );
  }

  return { mimeType, sizeBytes: file.size };
}
