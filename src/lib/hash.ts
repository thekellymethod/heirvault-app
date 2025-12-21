import { createHash } from "crypto";

/**
 * Cryptographic Hash Library
 * 
 * Provides SHA-256 hashing for documents, receipts, and audit trails.
 * All hashing uses SHA-256 for consistency and security.
 */

/**
 * Generate SHA-256 hash of a buffer
 * 
 * @param buffer - Buffer to hash
 * @returns Hexadecimal hash string
 */
export function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Generate SHA-256 hash of a string
 * 
 * @param data - String to hash
 * @returns Hexadecimal hash string
 */
export function sha256String(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Generate SHA-256 hash of JSON data
 * 
 * @param data - Object to hash (will be stringified)
 * @returns Hexadecimal hash string
 */
export function sha256Json(data: unknown): string {
  const jsonString = JSON.stringify(data, Object.keys(data as Record<string, unknown>).sort());
  return sha256String(jsonString);
}

/**
 * Verify hash matches data
 * 
 * @param data - Buffer or string to verify
 * @param expectedHash - Expected hash value
 * @returns True if hash matches
 */
export function verifyHash(data: Buffer | string, expectedHash: string): boolean {
  const computedHash = Buffer.isBuffer(data) ? sha256(data) : sha256String(data);
  return computedHash === expectedHash;
}
