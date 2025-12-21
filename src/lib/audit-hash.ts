import { createHash } from "crypto";

/**
 * Generate a cryptographic hash for an audit log entry.
 * This provides immutable proof of the entry's integrity.
 * Used for legal defensibility in disputes, compliance audits, and court proceedings.
 */
export function generateAuditHash(entry: {
  id: string;
  action: string;
  message: string;
  userId: string | null;
  clientId: string | null;
  policyId: string | null;
  createdAt: Date | string;
  orgId: string | null;
}): string {
  // Create a deterministic string representation of the audit entry
  const data = JSON.stringify({
    id: entry.id,
    action: entry.action,
    message: entry.message,
    userId: entry.userId || null,
    clientId: entry.clientId || null,
    policyId: entry.policyId || null,
    orgId: entry.orgId || null,
    createdAt: entry.createdAt instanceof Date 
      ? entry.createdAt.toISOString() 
      : new Date(entry.createdAt).toISOString(),
  });

  // Generate SHA-256 hash
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Generate a hash for a receipt to prove its integrity.
 */
export function generateReceiptHash(receipt: {
  receiptId: string;
  clientId: string;
  createdAt: Date | string;
  policies: Array<{ id: string; policyNumber: string | null }>;
}): string {
  const data = JSON.stringify({
    receiptId: receipt.receiptId,
    clientId: receipt.clientId,
    createdAt: receipt.createdAt instanceof Date 
      ? receipt.createdAt.toISOString() 
      : new Date(receipt.createdAt).toISOString(),
    policies: receipt.policies.map(p => ({
      id: p.id,
      policyNumber: p.policyNumber || null,
    })).sort((a, b) => a.id.localeCompare(b.id)),
  });

  return createHash("sha256").update(data).digest("hex");
}

/**
 * Generate a chain hash that links audit entries together.
 * This creates an immutable chain of events.
 */
export function generateChainHash(previousHash: string | null, currentEntry: {
  id: string;
  action: string;
  createdAt: Date | string;
}): string {
  const currentData = JSON.stringify({
    id: currentEntry.id,
    action: currentEntry.action,
    createdAt: currentEntry.createdAt instanceof Date 
      ? currentEntry.createdAt.toISOString() 
      : new Date(currentEntry.createdAt).toISOString(),
  });

  const combined = previousHash 
    ? `${previousHash}|${currentData}`
    : currentData;

  return createHash("sha256").update(combined).digest("hex");
}

