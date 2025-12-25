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

// Export Prisma enum types
export type {
  AuditAction,
  OrgRole,
  BillingPlan,
  UserRole,
  InviteStatus,
  AccessGrantStatus,
  SubmissionStatus,
  RegistryStatus,
  RegistrySubmissionSource,
  AccessLogAction,
  PolicyVerificationStatus,
} from "@prisma/client";

// Re-export enum constants from enums file for backward compatibility
export { AuditAction, OrgRole, BillingPlan, UserRole, InviteStatus, AccessGrantStatus } from "./enums";
