import { pgTable, text, timestamp, boolean, integer, json, date, pgEnum, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { randomUUID } from "crypto";

// Enums
export const accessGrantStatusEnum = pgEnum("AccessGrantStatus", ["ACTIVE", "REVOKED"]);
export const auditActionEnum = pgEnum("AuditAction", [
  "CLIENT_CREATED",
  "CLIENT_UPDATED",
  "POLICY_CREATED",
  "POLICY_UPDATED",
  "BENEFICIARY_CREATED",
  "BENEFICIARY_UPDATED",
  "INVITE_CREATED",
  "INVITE_ACCEPTED",
  "CLIENT_VIEWED",
  "CLIENT_SUMMARY_PDF_DOWNLOADED",
  "POLICY_SEARCH_PERFORMED",
  "GLOBAL_POLICY_SEARCH_PERFORMED",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_PROCESSED",
]);
export const billingPlanEnum = pgEnum("BillingPlan", ["FREE", "SOLO", "SMALL_FIRM", "ENTERPRISE"]);
export const inviteStatusEnum = pgEnum("InviteStatus", ["pending", "accepted", "expired", "revoked"]);
export const orgRoleEnum = pgEnum("OrgRole", ["OWNER", "ATTORNEY", "STAFF"]);
export const userRoleEnum = pgEnum("UserRole", ["attorney"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  clerkId: text("clerkId").notNull().unique(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: userRoleEnum("role").default("attorney"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  barNumber: text("bar_number"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  phone: text("phone"),
}, (table) => ({
  nameIdx: index("users_first_name_last_name_idx").on(table.firstName, table.lastName),
  addressIdx: index("users_address_idx").on(table.addressLine1, table.city, table.state, table.postalCode),
}));

// Organizations table
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  slug: text("slug").notNull().unique(),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  billingPlan: billingPlanEnum("billing_plan").default("FREE"),
  billingStatus: text("billing_status"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
});

// Org members table
export const orgMembers = pgTable("org_members", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: orgRoleEnum("role").default("ATTORNEY"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserOrg: uniqueIndex("org_members_user_id_organization_id_key").on(table.userId, table.organizationId),
}));

// Clients table
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  dateOfBirth: date("date_of_birth"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: uuid("user_id").references(() => users.id),
  orgId: uuid("org_id").references(() => organizations.id),
  driversLicense: text("drivers_license"),
  maidenName: text("maiden_name"),
  passportNumber: text("passport_number"),
  ssnLast4: text("ssn_last_4"),
  clientFingerprint: text("client_fingerprint").unique(),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
}, (table) => ({
  nameDobIdx: index("clients_first_name_last_name_date_of_birth_idx").on(table.firstName, table.lastName, table.dateOfBirth),
  addressIdx: index("clients_address_idx").on(table.addressLine1, table.city, table.state, table.postalCode),
  fingerprintIdx: index("clients_client_fingerprint_idx").on(table.clientFingerprint),
  orgIdx: index("clients_org_id_idx").on(table.orgId),
}));

// Insurers table
export const insurers = pgTable("insurers", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Policy verification status enum
export const policyVerificationStatusEnum = pgEnum("PolicyVerificationStatus", [
  "PENDING",
  "VERIFIED",
  "DISCREPANCY",
  "INCOMPLETE",
  "REJECTED",
]);

// Policies table
export const policies = pgTable("policies", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  insurerId: uuid("insurer_id").notNull().references(() => insurers.id, { onDelete: "cascade" }),
  policyNumber: text("policy_number"),
  policyType: text("policy_type"),
  verificationStatus: policyVerificationStatusEnum("verification_status").default("PENDING"),
  verifiedAt: timestamp("verified_at"),
  verifiedByUserId: uuid("verified_by_user_id").references(() => users.id),
  verificationNotes: text("verification_notes"),
  documentHash: text("document_hash"), // SHA-256 hash of source document
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Beneficiaries table
export const beneficiaries = pgTable("beneficiaries", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  relationship: text("relationship"),
  email: text("email"),
  phone: text("phone"),
  dateOfBirth: date("date_of_birth"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
}, (table) => ({
  nameDobIdx: index("beneficiaries_first_name_last_name_date_of_birth_idx").on(table.firstName, table.lastName, table.dateOfBirth),
  addressIdx: index("beneficiaries_address_idx").on(table.addressLine1, table.city, table.state, table.postalCode),
  clientIdx: index("beneficiaries_client_id_idx").on(table.clientId),
}));

// Policy beneficiaries junction table
export const policyBeneficiaries = pgTable("policy_beneficiaries", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  policyId: uuid("policy_id").notNull().references(() => policies.id, { onDelete: "cascade" }),
  beneficiaryId: uuid("beneficiary_id").notNull().references(() => beneficiaries.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniquePolicyBeneficiary: uniqueIndex("policy_beneficiaries_policy_id_beneficiary_id_key").on(table.policyId, table.beneficiaryId),
}));

// Client invites table
export const clientInvites = pgTable("client_invites", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  invitedByUserId: uuid("invited_by_user_id").references(() => users.id),
});

// Invites table
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  token: text("token").notNull().unique(),
  attorneyId: uuid("attorney_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  clientEmail: text("client_email").notNull(),
  status: inviteStatusEnum("status").default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Attorney client access table
export const attorneyClientAccess = pgTable("attorney_client_access", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  attorneyId: uuid("attorney_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  uniqueAttorneyClient: uniqueIndex("attorney_client_access_attorney_id_client_id_key").on(table.attorneyId, table.clientId),
}));

// Access grants table
export const accessGrants = pgTable("access_grants", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  attorneyUserId: uuid("attorney_user_id").references(() => users.id, { onDelete: "cascade" }),
  status: accessGrantStatusEnum("status").notNull(),
  grantedByUserId: uuid("granted_by_user_id"),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
}, (table) => ({
  uniqueClientOrg: uniqueIndex("access_grants_client_id_org_id_key").on(table.clientId, table.orgId),
  attorneyIdx: index("access_grants_attorney_user_id_idx").on(table.attorneyUserId),
  clientIdx: index("access_grants_client_id_idx").on(table.clientId),
  orgIdx: index("access_grants_org_id_idx").on(table.orgId),
}));

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: uuid("user_id").references(() => users.id),
  orgId: uuid("org_id").references(() => organizations.id),
  clientId: uuid("client_id").references(() => clients.id),
  policyId: uuid("policy_id").references(() => policies.id),
  action: auditActionEnum("action").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  clientIdx: index("audit_logs_client_id_idx").on(table.clientId),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  orgIdx: index("audit_logs_org_id_idx").on(table.orgId),
  policyIdx: index("audit_logs_policy_id_idx").on(table.policyId),
  userIdx: index("audit_logs_user_id_idx").on(table.userId),
}));

// Submission status enum
export const submissionStatusEnum = pgEnum("SubmissionStatus", ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]);

// Submissions table - tracks client submissions via invite tokens
export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  inviteId: uuid("invite_id").references(() => clientInvites.id, { onDelete: "set null" }),
  status: submissionStatusEnum("status").default("PENDING").notNull(),
  submissionType: text("submission_type").notNull(), // "INITIAL", "UPDATE", "POLICY_UPLOAD", "FORM_SCAN"
  submittedData: json("submitted_data"), // Stores the submitted form data
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  clientIdx: index("submissions_client_id_idx").on(table.clientId),
  inviteIdx: index("submissions_invite_id_idx").on(table.inviteId),
  statusIdx: index("submissions_status_idx").on(table.status),
  createdAtIdx: index("submissions_created_at_idx").on(table.createdAt),
}));

// Receipts table - tracks receipts generated for client submissions
export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  submissionId: uuid("submission_id").references(() => submissions.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  inviteId: uuid("invite_id").references(() => clientInvites.id, { onDelete: "set null" }),
  receiptNumber: text("receipt_number").notNull().unique(), // Format: REC-{clientId}-{timestamp}
  pdfPath: text("pdf_path"), // Path to generated PDF receipt
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  submissionIdx: index("receipts_submission_id_idx").on(table.submissionId),
  clientIdx: index("receipts_client_id_idx").on(table.clientId),
  inviteIdx: index("receipts_invite_id_idx").on(table.inviteId),
  receiptNumberIdx: index("receipts_receipt_number_idx").on(table.receiptNumber),
  createdAtIdx: index("receipts_created_at_idx").on(table.createdAt),
}));

// Documents table
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  submissionId: uuid("submission_id").references(() => submissions.id, { onDelete: "set null" }),
  policyId: uuid("policy_id").references(() => policies.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedVia: text("uploaded_via"),
  extractedData: json("extracted_data"),
  ocrConfidence: integer("ocr_confidence"),
  documentHash: text("document_hash").notNull(), // SHA-256 hash for cryptographic integrity
  verifiedAt: timestamp("verified_at"),
  verifiedByUserId: uuid("verified_by_user_id").references(() => users.id),
  verificationNotes: text("verification_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  clientIdx: index("documents_client_id_idx").on(table.clientId),
  submissionIdx: index("documents_submission_id_idx").on(table.submissionId),
  createdAtIdx: index("documents_created_at_idx").on(table.createdAt),
  policyIdx: index("documents_policy_id_idx").on(table.policyId),
  hashIdx: index("documents_document_hash_idx").on(table.documentHash),
}));

// Client versions table - stores versioned updates to preserve historical chain
export const clientVersions = pgTable("client_versions", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  inviteId: uuid("invite_id").references(() => clientInvites.id, { onDelete: "set null" }),
  versionNumber: integer("version_number").notNull(),
  previousVersionId: uuid("previous_version_id").references(() => clientVersions.id, { onDelete: "set null" }),
  // Store the complete state at this version
  clientData: json("client_data").notNull(), // Full client data snapshot
  policiesData: json("policies_data"), // Array of policies at this version
  beneficiariesData: json("beneficiaries_data"), // Array of beneficiaries at this version
  changes: json("changes"), // What changed from previous version
  submittedBy: text("submitted_by"), // "CLIENT" or "ATTORNEY"
  submissionMethod: text("submission_method"), // "QR_CODE", "EMAIL", "PORTAL", etc.
  notes: text("notes"), // Optional notes about the update
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  clientIdx: index("client_versions_client_id_idx").on(table.clientId),
  inviteIdx: index("client_versions_invite_id_idx").on(table.inviteId),
  versionIdx: index("client_versions_version_number_idx").on(table.versionNumber),
  createdAtIdx: index("client_versions_created_at_idx").on(table.createdAt),
  previousVersionIdx: index("client_versions_previous_version_id_idx").on(table.previousVersionId),
}));

// Type exports for use in code
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Policy = typeof policies.$inferSelect;
export type NewPolicy = typeof policies.$inferInsert;
export type Beneficiary = typeof beneficiaries.$inferSelect;
export type NewBeneficiary = typeof beneficiaries.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrgMember = typeof orgMembers.$inferSelect;
export type NewOrgMember = typeof orgMembers.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type ClientVersion = typeof clientVersions.$inferSelect;
export type NewClientVersion = typeof clientVersions.$inferInsert;

// Enum type exports (for compatibility with @prisma/client imports)
export type AuditAction = "CLIENT_CREATED" | "CLIENT_UPDATED" | "POLICY_CREATED" | "POLICY_UPDATED" | "BENEFICIARY_CREATED" | "BENEFICIARY_UPDATED" | "INVITE_CREATED" | "INVITE_ACCEPTED" | "CLIENT_VIEWED" | "CLIENT_SUMMARY_PDF_DOWNLOADED" | "POLICY_SEARCH_PERFORMED" | "GLOBAL_POLICY_SEARCH_PERFORMED" | "DOCUMENT_UPLOADED" | "DOCUMENT_PROCESSED";
export type OrgRole = "OWNER" | "ATTORNEY" | "STAFF";
export type BillingPlan = "FREE" | "SOLO" | "SMALL_FIRM" | "ENTERPRISE";
export type UserRole = "attorney";
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type SubmissionStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type AccessGrantStatus = "ACTIVE" | "REVOKED"; // Deprecated - use AttorneyClientAccess instead
export type PolicyVerificationStatus = "PENDING" | "VERIFIED" | "DISCREPANCY" | "INCOMPLETE" | "REJECTED";

// Export enum values as constants for compatibility (separate namespace)
export const AuditActionEnum = {
  CLIENT_CREATED: "CLIENT_CREATED" as const,
  CLIENT_UPDATED: "CLIENT_UPDATED" as const,
  POLICY_CREATED: "POLICY_CREATED" as const,
  POLICY_UPDATED: "POLICY_UPDATED" as const,
  BENEFICIARY_CREATED: "BENEFICIARY_CREATED" as const,
  BENEFICIARY_UPDATED: "BENEFICIARY_UPDATED" as const,
  INVITE_CREATED: "INVITE_CREATED" as const,
  INVITE_ACCEPTED: "INVITE_ACCEPTED" as const,
  CLIENT_VIEWED: "CLIENT_VIEWED" as const,
  CLIENT_SUMMARY_PDF_DOWNLOADED: "CLIENT_SUMMARY_PDF_DOWNLOADED" as const,
  POLICY_SEARCH_PERFORMED: "POLICY_SEARCH_PERFORMED" as const,
  GLOBAL_POLICY_SEARCH_PERFORMED: "GLOBAL_POLICY_SEARCH_PERFORMED" as const,
  DOCUMENT_UPLOADED: "DOCUMENT_UPLOADED" as const,
  DOCUMENT_PROCESSED: "DOCUMENT_PROCESSED" as const,
} as const;

