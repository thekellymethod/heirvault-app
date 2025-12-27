// src/lib/match.ts
import { normalize } from "@/lib/piiMask";

export function normalizePolicyNumber(s?: string | null) {
  if (!s) return null;
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeCarrier(s?: string | null) {
  if (!s) return null;
  return normalize(s)
    .replace(/\b(insurance|assurance|company|co|inc|llc|ltd)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function nameSimilarity(a?: string | null, b?: string | null) {
  if (!a || !b) return 0;
  const A = normalize(a);
  const B = normalize(b);
  if (!A || !B) return 0;
  if (A === B) return 1;

  // token overlap score
  const ta = new Set(A.split(" "));
  const tb = new Set(B.split(" "));
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const denom = Math.max(ta.size, tb.size);
  return denom ? inter / denom : 0;
}

export function dobMatch(expected?: Date | null, extracted?: string | null) {
  if (!expected || !extracted) return false;
  // extracted is a string like MM/DD/YYYY
  const m = extracted.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-]((?:19|20)\d{2})/);
  if (!m) return false;
  const mm = Number(m[1]), dd = Number(m[2]), yyyy = Number(m[3]);
  if (!mm || !dd || !yyyy) return false;

  const exp = new Date(expected);
  return exp.getUTCFullYear() === yyyy && (exp.getUTCMonth() + 1) === mm && exp.getUTCDate() === dd;
}

