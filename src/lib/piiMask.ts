// src/lib/piiMask.ts
export function maskIdLike(text: string) {
  // Masks long digit sequences that look like IDs (DL, SSN-like, acct #)
  // Keep last4 only.
  return text.replace(/\b(\d{5,})\b/g, (m) => {
    const last4 = m.slice(-4);
    return `****${last4}`;
  });
}

export function normalize(s: string) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function safeLast4(s?: string | null) {
  if (!s) return null;
  const digits = s.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

