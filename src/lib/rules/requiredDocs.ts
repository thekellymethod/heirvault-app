// src/lib/rules/requiredDocs.ts
import { ChangeRequestType } from "@prisma/client";

// Document type strings (matching your schema's fileType field)
export type DocTypeString = "DRIVERS_LICENSE" | "PASSPORT" | "POLICY" | "BENEFICIARY_DOC" | "TAX_W9" | "TAX_1040" | "TAX_OTHER" | "COURT_FILING" | "DEMAND_LETTER" | "CLAIM_SUMMARY" | "OTHER";

export type IntakeRules = {
  requireGovId: boolean;
  requirePolicy: boolean;
  requireTax: boolean;
  requireBeneficiaryDocs: boolean;
};

export function intakeRules(params: {
  requireGovId?: boolean;
  requireTax?: boolean;
  beneficiariesExpected?: number | null;
}): IntakeRules {
  return {
    requireGovId: params.requireGovId ?? true,
    requirePolicy: true,
    requireTax: params.requireTax ?? false,
    requireBeneficiaryDocs: (params.beneficiariesExpected ?? 0) > 0,
  };
}

export function requiredDocTypesForInvite(r: IntakeRules): DocTypeString[] {
  const out: DocTypeString[] = [];
  if (r.requireGovId) out.push("DRIVERS_LICENSE");
  if (r.requirePolicy) out.push("POLICY");
  if (r.requireTax) {
    out.push("TAX_W9", "TAX_1040", "TAX_OTHER");
  }
  if (r.requireBeneficiaryDocs) out.push("BENEFICIARY_DOC");
  return out;
}

export function requiredDocTypesForChangeRequest(t: ChangeRequestType): DocTypeString[] {
  switch (t) {
    case ChangeRequestType.ID_UPDATE:
      return ["DRIVERS_LICENSE", "PASSPORT"];
    case ChangeRequestType.POLICY_UPDATE:
      return ["POLICY"];
    case ChangeRequestType.BENEFICIARY_UPDATE:
      return ["BENEFICIARY_DOC"];
    case ChangeRequestType.TAX_UPDATE:
      return ["TAX_W9", "TAX_1040", "TAX_OTHER"];
    case ChangeRequestType.ADDRESS_UPDATE:
      return ["OTHER"]; // you may define ADDRESS_PROOF later
    default:
      return ["OTHER"];
  }
}

