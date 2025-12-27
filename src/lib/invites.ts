// src/lib/invites.ts
import crypto from "crypto";

export function generateInviteToken(): string {
  // URL-safe token
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

