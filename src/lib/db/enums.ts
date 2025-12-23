// Enum constants for compatibility with Prisma-style usage
// Use these like: AuditAction.CLIENT_CREATED

export const AuditAction = {
  CLIENT_CREATED: "CLIENT_CREATED",
  CLIENT_UPDATED: "CLIENT_UPDATED",
  POLICY_CREATED: "POLICY_CREATED",
  POLICY_UPDATED: "POLICY_UPDATED",
  BENEFICIARY_CREATED: "BENEFICIARY_CREATED",
  BENEFICIARY_UPDATED: "BENEFICIARY_UPDATED",
  INVITE_CREATED: "INVITE_CREATED",
  INVITE_ACCEPTED: "INVITE_ACCEPTED",
  INVITE_REACTIVATED: "INVITE_REACTIVATED",
  CLIENT_VIEWED: "CLIENT_VIEWED",
  CLIENT_SUMMARY_PDF_DOWNLOADED: "CLIENT_SUMMARY_PDF_DOWNLOADED",
  POLICY_SEARCH_PERFORMED: "POLICY_SEARCH_PERFORMED",
  GLOBAL_POLICY_SEARCH_PERFORMED: "GLOBAL_POLICY_SEARCH_PERFORMED",
  DOCUMENT_UPLOADED: "DOCUMENT_UPLOADED",
  DOCUMENT_PROCESSED: "DOCUMENT_PROCESSED",
} as const;

export const OrgRole = {
  OWNER: "OWNER",
  ATTORNEY: "ATTORNEY",
  STAFF: "STAFF",
} as const;

export const BillingPlan = {
  FREE: "FREE",
  SOLO: "SOLO",
  SMALL_FIRM: "SMALL_FIRM",
  ENTERPRISE: "ENTERPRISE",
} as const;

export const UserRole = {
  attorney: "attorney",
} as const;

export const InviteStatus = {
  pending: "pending",
  accepted: "accepted",
  expired: "expired",
  revoked: "revoked",
} as const;

export const AccessGrantStatus = {
  ACTIVE: "ACTIVE",
  REVOKED: "REVOKED",
} as const;

// Type exports
export type AuditAction = typeof AuditAction[keyof typeof AuditAction];
export type OrgRole = typeof OrgRole[keyof typeof OrgRole];
export type BillingPlan = typeof BillingPlan[keyof typeof BillingPlan];
export type UserRole = typeof UserRole[keyof typeof UserRole];
export type InviteStatus = typeof InviteStatus[keyof typeof InviteStatus];
export type AccessGrantStatus = typeof AccessGrantStatus[keyof typeof AccessGrantStatus];

