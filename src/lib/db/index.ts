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

// Alias for backward compatibility
export type DocumentRow = Document;

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

// Registry function stubs - these need to be implemented using Supabase
export async function getRegistryById(registryId: string): Promise<RegistryRecord | null> {
  const { findUnique } = await import("./supabase");
  return findUnique<RegistryRecord>("registry_records", { id: registryId });
}

export async function getRegistryVersions(registryId: string): Promise<RegistryVersion[]> {
  const { findMany } = await import("./supabase");
  const versions = await findMany<RegistryVersion>("registry_versions", {
    where: { registryId },
    orderBy: { column: "createdAt", ascending: false },
  });
  return versions || [];
}

export async function getDocumentsForRegistry(registryId: string): Promise<Document[]> {
  const { findMany } = await import("./supabase");
  // Get versions first, then documents for those versions
  const versions = await getRegistryVersions(registryId);
  const versionIds = versions.map(v => v.id);
  
  if (versionIds.length === 0) return [];
  
  const { findMany: findManyDocs } = await import("./supabase");
  const allDocs: Document[] = [];
  
  for (const versionId of versionIds) {
    const docs = await findManyDocs<Document>("documents", {
      where: { registryVersionId: versionId },
    });
    if (docs) allDocs.push(...docs);
  }
  
  return allDocs;
}

export async function listAuthorizedRegistries(userId: string, limit?: number): Promise<RegistryRecord[]> {
  const { findMany } = await import("./supabase");
  // Get registries the user has access to via registry_permissions
  const permissions = await findMany<{ registryId: string }>("registry_permissions", {
    where: { userId },
    limit: limit || 100,
  });
  
  if (!permissions || permissions.length === 0) return [];
  
  const registryIds = permissions.map(p => p.registryId);
  const registries: RegistryRecord[] = [];
  
  for (const id of registryIds) {
    const registry = await getRegistryById(id);
    if (registry) registries.push(registry);
  }
  
  return registries;
}

// Placeholder functions for registry operations
export async function createRegistryRecord(data: {
  decedentName: string;
  status?: string;
  orgId?: string;
}): Promise<RegistryRecord> {
  const { create } = await import("./supabase");
  const { randomUUID } = await import("crypto");
  const record = await create<RegistryRecord>("registry_records", {
    id: randomUUID(),
    decedentName: data.decedentName,
    status: data.status || "PENDING_VERIFICATION",
    createdAt: new Date(),
  } as Record<string, unknown>);
  return record as RegistryRecord;
}

export async function appendRegistryVersion(registryId: string, data: {
  dataJson: Record<string, unknown>;
  submittedBy: string;
  hash: string;
}): Promise<RegistryVersion> {
  const { create } = await import("./supabase");
  const { randomUUID } = await import("crypto");
  const version = await create<RegistryVersion>("registry_versions", {
    id: randomUUID(),
    registryId,
    dataJson: data.dataJson,
    submittedBy: data.submittedBy,
    hash: data.hash,
    createdAt: new Date(),
  } as Record<string, unknown>);
  return version as RegistryVersion;
}

export async function addDocumentRow(data: {
  clientId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  mimeType: string;
  documentHash: string;
  sensitivityLevel: string;
  classificationStatus: string;
}): Promise<Document> {
  const { create } = await import("./supabase");
  const { randomUUID } = await import("crypto");
  const document = await create<Document>("documents", {
    id: randomUUID(),
    clientId: data.clientId,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize,
    filePath: data.filePath,
    mimeType: data.mimeType,
    documentHash: data.documentHash,
    sensitivityLevel: data.sensitivityLevel,
    classificationStatus: data.classificationStatus,
    content_type: data.mimeType,
    size_bytes: data.fileSize,
    sha256: data.documentHash,
    storage_path: data.filePath,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Record<string, unknown>);
  return document as Document;
}
