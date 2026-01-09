// src/lib/client-fingerprint.ts
import { createHash } from "crypto";

type FingerprintInput = {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | null;
  ssnLast4?: string | null;
  passportNumber?: string | null;
  driversLicense?: string | null;
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function generateClientFingerprint(input: FingerprintInput): string {
  const dob =
    input.dateOfBirth instanceof Date
      ? input.dateOfBirth.toISOString().slice(0, 10)
      : "";

  // stable, deterministic concatenation
  const raw = [
    norm(input.email),
    norm(input.firstName),
    norm(input.lastName),
    dob,
    norm(input.ssnLast4),
    norm(input.passportNumber),
    norm(input.driversLicense),
  ].join("|");

  return createHash("sha256").update(raw).digest("hex");
}
