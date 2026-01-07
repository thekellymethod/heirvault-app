// src/lib/textractParse.ts
import type { Block } from "@aws-sdk/client-textract";
import { maskIdLike, normalize, safeLast4 } from "@/lib/piiMask";

export type ExtractedEntities = {
  // Safe fields
  policyholderName?: string | null;
  dob?: string | null;
  addressLine?: string | null;
  carrier?: string | null;
  policyNumberMasked?: string | null;  // masked / partial
  idNumberLast4?: string | null;       // last4 only
  beneficiaries?: Array<{ fullName: string }>;
  rawTextPreview?: string;             // masked, short preview only
};

export function blocksToText(blocks: Block[]): string {
  return blocks
    .filter(b => b.BlockType === "LINE" && b.Text)
    .map(b => b.Text!)
    .join("\n");
}

function findLikelyPolicyNumber(text: string) {
  // Enhanced heuristic: look for "Policy" near an alphanumeric token
  const lines = text.split("\n");
  const patterns = [
    /policy\s*(?:number|#|no\.?|num|id)\s*:?\s*([A-Z0-9\-]{6,25})/i,
    /(?:policy|pol)\.?\s*(?:no|number|#|num|id)\s*:?\s*([A-Z0-9\-]{6,25})/i,
    /(?:certificate|cert|contract|account)\s*(?:number|#|no\.?|num|id)\s*:?\s*([A-Z0-9\-]{6,25})/i,
  ];

  // Try patterns first
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length >= 6 && match[1].length <= 25) {
      return match[1];
    }
  }

  // Fallback to line-by-line search
  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.includes("policy") && (l.includes("no") || l.includes("#") || l.includes("number"))) {
      const m = line.match(/([A-Z0-9][A-Z0-9\-]{5,})/i);
      if (m?.[1] && m[1].length >= 6 && m[1].length <= 25) return m[1];
    }
  }
  return null;
}

function findDOB(text: string) {
  // Simple date patterns: MM/DD/YYYY or similar
  const m = text.match(/\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/);
  return m?.[0] ?? null;
}

function findCarrier(text: string) {
  // Super light heuristic; your real system will map carriers by alias later.
  // Here: pick a few common keywords; otherwise return null.
  const lines = text.split("\n").slice(0, 40);
  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.includes("insurance") || l.includes("assurance")) {
      // Use first matching line as a "carrier-ish" label
      return line.slice(0, 80);
    }
  }
  return null;
}

function findLikelyName(text: string) {
  // Enhanced heuristic: look for lines like "Name:" or typical ID header lines
  const lines = text.split("\n").slice(0, 50);
  
  // Try patterns with labels first
  const namePatterns = [
    /(?:insured|policyholder|owner|client|applicant|name)\s*:?\s*([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)/i,
    /(?:first\s+name|given\s+name|fname)\s*:?\s*([A-Z][a-z]{2,})/i,
    /(?:last\s+name|surname|family\s+name|lname)\s*:?\s*([A-Z][a-z]{2,})/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1] && match[2]) {
        return `${match[1]} ${match[2]}`.slice(0, 80);
      } else if (match[1]) {
        return match[1].slice(0, 80);
      }
    }
  }

  // Fallback: look for "Name:" label
  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.includes("name") && l.includes(":")) {
      const rhs = line.split(":").slice(1).join(":").trim();
      if (rhs.match(/[A-Za-z]{2,}\s+[A-Za-z]{2,}/)) return rhs.slice(0, 80);
    }
  }
  
  // Final fallback: first "Firstname Lastname" style line
  for (const line of lines) {
    if (line.match(/^[A-Za-z]{2,}\s+[A-Za-z]{2,}(\s+[A-Za-z]{2,})?$/)) {
      return line.trim().slice(0, 80);
    }
  }
  return null;
}

function extractBeneficiaries(text: string) {
  // Enhanced heuristic: if line contains "beneficiary" then capture following name-like tokens
  const out: Array<{ fullName: string }> = [];
  const lines = text.split("\n");
  
  // Enhanced patterns for beneficiary extraction
  const beneficiaryPatterns = [
    /(?:beneficiary|beneficiaries?)\s*:?\s*([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})/gi,
    /(?:primary\s+beneficiary|contingent\s+beneficiary)\s*:?\s*([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})/gi,
  ];

  // Try pattern matching first
  for (const pattern of beneficiaryPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      if (match[1] && match[2]) {
        out.push({ fullName: `${match[1]} ${match[2]}`.trim().slice(0, 80) });
      }
    }
  }

  // Fallback to line-by-line search
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (l.includes("beneficiary")) {
      // Try next 1–5 lines for names (increased from 3)
      for (let j = 1; j <= 5; j++) {
        const cand = lines[i + j];
        if (!cand) break;
        // Enhanced "name-like" filter
        if (cand.match(/^[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(\s+[A-Z][a-z]+)?$/)) {
          out.push({ fullName: cand.trim().slice(0, 80) });
        }
      }
    }
  }
  
  // Dedup
  const seen = new Set<string>();
  return out.filter(b => {
    const k = normalize(b.fullName);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function parseEntitiesFromText(textRaw: string): ExtractedEntities {
  const text = maskIdLike(textRaw);

  const policyholderName = findLikelyName(textRaw);
  const policyNum = findLikelyPolicyNumber(textRaw);
  const dob = findDOB(textRaw);
  const carrier = findCarrier(textRaw);

  // For DL/ID numbers, best we do here is last4 if we detect a long digit token
  const idCandidate = (textRaw.match(/\b\d{7,}\b/)?.[0]) ?? null;

  const beneficiaries = extractBeneficiaries(textRaw);

  return {
    policyholderName,
    dob,
    carrier,
    policyNumberMasked: policyNum ? maskIdLike(policyNum) : null,
    idNumberLast4: safeLast4(idCandidate),
    beneficiaries: beneficiaries.length ? beneficiaries : undefined,
    rawTextPreview: text.split("\n").slice(0, 20).join("\n").slice(0, 1200), // masked preview only
  };
}

