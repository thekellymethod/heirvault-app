/**
 * Document Category Taxonomy
 * 
 * Classifies documents by legal function:
 * - AUTHORITY: Documents establishing legal authority (power of attorney, guardianship)
 * - OWNERSHIP: Documents proving ownership or beneficiary status
 * - LIQUIDITY: Documents related to financial assets and access
 * - CONTINUITY: Documents ensuring business/estate continuity
 * - INTENT: Documents expressing intent (wills, trusts, designations)
 */

import type { DocumentCategory } from "@/lib/db";

export const DOCUMENT_CATEGORIES = {
  AUTHORITY: "AUTHORITY",
  OWNERSHIP: "OWNERSHIP",
  LIQUIDITY: "LIQUIDITY",
  CONTINUITY: "CONTINUITY",
  INTENT: "INTENT",
} as const;

export type DocumentCategoryType = DocumentCategory;

/**
 * Category definitions with descriptions
 */
export const CATEGORY_DEFINITIONS: Record<DocumentCategoryType, {
  label: string;
  description: string;
  examples: string[];
}> = {
  AUTHORITY: {
    label: "Authority",
    description: "Documents establishing legal authority to act on behalf of another party",
    examples: [
      "Power of Attorney",
      "Guardianship Orders",
      "Court-Appointed Conservatorship",
      "Trustee Appointment Letters",
    ],
  },
  OWNERSHIP: {
    label: "Ownership",
    description: "Documents proving ownership, beneficiary status, or legal interest",
    examples: [
      "Policy Ownership Documents",
      "Beneficiary Designation Forms",
      "Deed of Trust",
      "Property Titles",
    ],
  },
  LIQUIDITY: {
    label: "Liquidity",
    description: "Documents related to financial assets, account access, and payment authorization",
    examples: [
      "Bank Statements",
      "Account Authorization Forms",
      "Payment Instructions",
      "Financial Account Documents",
    ],
  },
  CONTINUITY: {
    label: "Continuity",
    description: "Documents ensuring business or estate continuity during transitions",
    examples: [
      "Succession Plans",
      "Business Continuity Agreements",
      "Estate Planning Documents",
      "Transition Plans",
    ],
  },
  INTENT: {
    label: "Intent",
    description: "Documents expressing intent, wishes, or designations",
    examples: [
      "Wills",
      "Trust Documents",
      "Beneficiary Designations",
      "Letter of Intent",
    ],
  },
  OTHER: {
    label: "Other",
    description: "Documents that do not fit the primary categories yet",
    examples: [
      "Miscellaneous correspondence",
      "Unclassified attachments",
    ],
  },
};

/**
 * Map existing fileType values to document categories
 * This provides backward compatibility and automatic categorization
 */
export function mapFileTypeToCategory(fileType: string | null | undefined): DocumentCategoryType | null {
  if (!fileType) return null;

  const normalized = fileType.toUpperCase().trim();

  // Authority documents
  if (
    normalized.includes("POWER_OF_ATTORNEY") ||
    normalized.includes("POA") ||
    normalized.includes("GUARDIANSHIP") ||
    normalized.includes("CONSERVATORSHIP") ||
    normalized.includes("TRUSTEE") ||
    normalized.includes("AUTHORITY")
  ) {
    return DOCUMENT_CATEGORIES.AUTHORITY;
  }

  // Ownership documents
  if (
    normalized.includes("OWNERSHIP") ||
    normalized.includes("BENEFICIARY") ||
    normalized.includes("DEED") ||
    normalized.includes("TITLE") ||
    normalized.includes("POLICY") && (normalized.includes("OWNER") || normalized.includes("BENEFICIARY"))
  ) {
    return DOCUMENT_CATEGORIES.OWNERSHIP;
  }

  // Liquidity documents
  if (
    normalized.includes("BANK") ||
    normalized.includes("ACCOUNT") ||
    normalized.includes("FINANCIAL") ||
    normalized.includes("PAYMENT") ||
    normalized.includes("TAX_W9") ||
    normalized.includes("TAX_1040") ||
    normalized.includes("TAX_OTHER") ||
    normalized.includes("STATEMENT")
  ) {
    return DOCUMENT_CATEGORIES.LIQUIDITY;
  }

  // Continuity documents
  if (
    normalized.includes("SUCCESSION") ||
    normalized.includes("CONTINUITY") ||
    normalized.includes("TRANSITION") ||
    normalized.includes("ESTATE_PLAN")
  ) {
    return DOCUMENT_CATEGORIES.CONTINUITY;
  }

  // Intent documents
  if (
    normalized.includes("WILL") ||
    normalized.includes("TRUST") ||
    normalized.includes("DESIGNATION") ||
    normalized.includes("INTENT") ||
    normalized.includes("LETTER_OF_INTENT")
  ) {
    return DOCUMENT_CATEGORIES.INTENT;
  }

  // Default: Try to infer from common patterns
  // Policy documents are typically OWNERSHIP
  if (normalized.includes("POLICY")) {
    return DOCUMENT_CATEGORIES.OWNERSHIP;
  }

  // Court filings are typically AUTHORITY
  if (normalized.includes("COURT") || normalized.includes("FILING")) {
    return DOCUMENT_CATEGORIES.AUTHORITY;
  }

  // Return null for unmapped types - will need manual classification
  return null;
}

/**
 * Get category for a document, with fallback logic
 */
export function getDocumentCategory(
  fileType: string | null | undefined,
  existingCategory: DocumentCategoryType | null | undefined
): DocumentCategoryType | null {
  // If category already set, use it
  if (existingCategory) {
    return existingCategory;
  }

  // Try to map from fileType
  return mapFileTypeToCategory(fileType);
}

/**
 * Get taxonomy configuration for frontend
 * This is read-only and can be tier-gated later
 */
export function getTaxonomyConfig() {
  return {
    categories: Object.entries(CATEGORY_DEFINITIONS).map(([key, value]) => ({
      id: key,
      ...value,
    })),
    version: "1.0.0",
  };
}
