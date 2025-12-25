// Re-export Prisma client from the main prisma module
export { prisma } from "../prisma";
export { prisma as db } from "../prisma";

// Export Prisma model types
export type {
  User,
  clients as Client,
  policies as Policy,
  beneficiaries as Beneficiary,
  organizations as Organization,
  org_members as OrgMember,
  submissions as Submission,
  receipts as Receipt,
  documents as Document,
  client_versions as ClientVersion,
  registry_records as RegistryRecord,
  registry_versions as RegistryVersion,
  access_logs as AccessLog,
} from "@prisma/client";

// Export Prisma enum types (for type annotations)
// Note: AuditAction, OrgRole, BillingPlan, UserRole, InviteStatus are exported as values from ./enums below
// and can be used as types via typeof when needed
export type {
  AccessGrantStatus,
  SubmissionStatus,
  RegistryStatus,
  RegistrySubmissionSource,
  AccessLogAction,
  PolicyVerificationStatus,
} from "@prisma/client";

// Re-export enum constants from enums file (values)
// These provide enum values like AuditAction.CLIENT_CREATED
// Note: These can be used as both types (via typeof) and values in TypeScript
export { AuditAction, OrgRole, BillingPlan, UserRole, InviteStatus } from "./enums";
