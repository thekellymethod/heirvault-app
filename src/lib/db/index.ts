// Database exports
// Supabase database client and helpers

export { getDb, findUnique, findMany, create, update, deleteRecord, count, upsert, transaction, queryRaw } from "./supabase";
export { supabaseAdmin as db } from "@/lib/supabaseAdmin";

// Export enum types
export type DocumentCategory = typeof import("./enums").DocumentCategory[keyof typeof import("./enums").DocumentCategory];
export type ChangeRequestType = typeof import("./enums").ChangeRequestType[keyof typeof import("./enums").ChangeRequestType];
export type ChangeRequestStatus = typeof import("./enums").ChangeRequestStatus[keyof typeof import("./enums").ChangeRequestStatus];
export type BillingPlan = typeof import("./enums").BillingPlan[keyof typeof import("./enums").BillingPlan];

// Placeholder types for compatibility (should be replaced with actual types)
export type User = {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  barNumber: string | null;
};

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: Date | null;
  orgId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Policy = {
  id: string;
  clientId: string;
  policyNumber: string;
  policyType: string | null;
  carrierNameRaw: string | null;
  insurerId: string | null;
  verificationStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Beneficiary = {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  verificationStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Organization = {
  id: string;
  name: string;
  billingPlan: string;
  createdAt: Date;
  updatedAt: Date;
};

export type OrgMember = {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  createdAt: Date;
};

export type Document = {
  id: string;
  clientId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  mimeType: string;
  documentHash: string;
  sensitivityLevel: string;
  classificationStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

// Registry-related types (Supabase-only, not in Prisma schema)
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
export { AuditAction, OrgRole, BillingPlan, UserRole, InviteStatus } from "./enums";
