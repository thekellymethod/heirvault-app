// src/lib/invite-token.ts
// Secure token generation and hashing for client invites

import { createHash } from "crypto";

/**
 * Generate a cryptographically secure random token
 */
export function generateInviteToken(): string {
  // Generate 32 bytes of random data and encode as base64url
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(randomBytes).toString("base64url");
}

/**
 * Hash a token using SHA-256
 * This is what we store in the database (never store plaintext tokens)
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verify a token against a hash
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  const computedHash = hashToken(token);
  return computedHash === hash;
}

