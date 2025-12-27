// src/lib/confidence.ts
export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";

export function bandFromScore(score: number): ConfidenceBand {
  if (score >= 85) return "HIGH";
  if (score >= 70) return "MEDIUM";
  return "LOW";
}

export function scoreDocument(input: {
  nameMatch?: boolean;
  dobMatch?: boolean;
  policyNumberMatch?: boolean;
  carrierMatch?: boolean;
  docTypeConfidence?: number; // 0..1
}) {
  // Simple, explainable rubric (internal)
  let score = 0;
  if (input.nameMatch) score += 30;
  if (input.dobMatch) score += 15;
  if (input.policyNumberMatch) score += 25;
  if (input.carrierMatch) score += 10;
  score += Math.round(((input.docTypeConfidence ?? 0.5) * 20)); // 0..20

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    reasons: {
      nameMatch: !!input.nameMatch,
      dobMatch: !!input.dobMatch,
      policyNumberMatch: !!input.policyNumberMatch,
      carrierMatch: !!input.carrierMatch,
      docTypeConfidence: input.docTypeConfidence ?? 0.5,
    },
  };
}

