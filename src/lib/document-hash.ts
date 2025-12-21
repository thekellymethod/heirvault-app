import { createHash } from "crypto";

/**
 * Generate a cryptographic hash for a document.
 * This provides immutable proof of the document's integrity.
 * Used for legal defensibility and verification.
 */
export function generateDocumentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Generate a hash for policy data to prove its integrity.
 */
export function generatePolicyHash(policy: {
  policyNumber: string | null;
  policyType: string | null;
  insurerId: string;
  clientId: string;
  documentHash: string | null;
}): string {
  const data = JSON.stringify({
    policyNumber: policy.policyNumber || null,
    policyType: policy.policyType || null,
    insurerId: policy.insurerId,
    clientId: policy.clientId,
    documentHash: policy.documentHash || null,
  });

  return createHash("sha256").update(data).digest("hex");
}

