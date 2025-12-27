// src/lib/security.ts
import crypto from "crypto";

export function makeReceiptNumber(): string {
  // Human-safe, non-sequential
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let out = "RV-";
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  // RV-XXXXXXXX
  return out;
}

export function nowPlusHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

