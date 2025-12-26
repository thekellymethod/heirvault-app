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
  documents as Document,
} from "@prisma/client";

// Export additional Prisma model types for convenience
export type {
  clients,
  beneficiaries,
  policies,
  organizations,
  org_members,
  attorneyClientAccess,
  insurers,
} from "@prisma/client";

// Export Prisma enum types (for type annotations)
// Note: AuditAction, OrgRole, BillingPlan, UserRole, InviteStatus are exported as values from ./enums below
// and can be used as types via typeof when needed
export type {
  AccessGrantStatus,
} from "@prisma/client";

// Registry-related types (Supabase-only, not in Prisma schema)
// These are defined separately since registry tables are in Supabase, not PostgreSQL
export type RegistryRecord = {
  id: string;
  decedentName: string;
  status: string;
  createdAt: Date;
};

export type RegistryVersion = {
  id: string;
  registryId: string;
  dataJson: Record<string, unknown>;
  submittedBy: string;
  hash: string;
  createdAt: Date;
};

export type AccessLog = {
  id: string;
  registryId: string;
  userId: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
};

export type RegistryStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
export type RegistrySubmissionSource = "INTAKE" | "TOKEN" | "ATTORNEY" | "SYSTEM";
export type AccessLogAction = "CREATED" | "UPDATED" | "VIEWED" | "VERIFIED" | "REJECTED";

// Re-export enum constants from enums file (values)
// These provide enum values like AuditAction.CLIENT_CREATED
// Note: These can be used as both types (via typeof) and values in TypeScript
export { AuditAction, OrgRole, BillingPlan, UserRole, InviteStatus } from "./enums";
