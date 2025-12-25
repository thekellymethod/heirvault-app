import { prisma, type RegistryRecord, type RegistryVersion, type AccessLog, type RegistryStatus, type RegistrySubmissionSource, type AccessLogAction } from "./index";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

/**
 * Typed Return Objects
 * These ensure TypeScript enforces correctness throughout the codebase
 */

export type RegistryWithVersions = RegistryRecord & {
  versions: RegistryVersion[];
  latestVersion: RegistryVersion | null;
  accessLogs: AccessLog[];
};

export type RegistryVersionWithDocuments = RegistryVersion & {
  documents: Array<{
    id: string,
    fileName: string,
    filePath: string,
    documentHash: string,
    createdAt: Date;
  }>;
};

export type CreateRegistryInput = {
  decedentName: string,
  status?: RegistryStatus;
  initialData: Record<string, unknown>; // JSON data for first version
  submittedBy: RegistrySubmissionSource;
};

export type AppendVersionInput = {
  registryId: string,
  data: Record<string, unknown>; // JSON data for new version
  submittedBy: RegistrySubmissionSource;
};

export type LogAccessInput = {
  registryId: string,
  userId?: string | null; // null for system actions
  action: AccessLogAction;
  metadata?: Record<string, unknown>; // Additional metadata for audit trail
};

/**
 * Create a new registry record with initial version
 * 
 * Rule: Nothing ever updates in place. Every change creates a new version row.
 * This function creates both the registry record and its first version atomically.
 */
export async function createRegistry(input: CreateRegistryInput): Promise<RegistryWithVersions> {
  const registryId = randomUUID();
  const versionId = randomUUID();
  
  // Generate hash for initial data
  const dataJson = JSON.stringify(input.initialData);
  const hash = createHash("sha256").update(dataJson).digest("hex");

  // Create registry record and first version in a transaction
  await prisma.$transaction(async (tx) => {
    // Insert registry record
    await tx.registry_records.create({
      data: {
        id: registryId,
        decedentName: input.decedentName,
        status: input.status || "PENDING_VERIFICATION",
      },
    });

    // Insert first version
    await tx.registry_versions.create({
      data: {
        id: versionId,
        registry_id: registryId,
        data_json: input.initialData,
        submitted_by: input.submittedBy,
        hash: hash,
      },
    });

    // Log creation
    await tx.access_logs.create({
      data: {
        id: randomUUID(),
        registry_id: registryId,
        user_id: null, // System action
        action: "CREATED",
      },
    });
  });

  // Fetch and return the complete registry with versions
  return getRegistryById(registryId);
}

/**
 * Append a new version to an existing registry
 * 
 * Rule: Nothing ever updates in place. Every change creates a new version row.
 * This function creates a new version row, preserving the historical chain.
 */
export async function appendRegistryVersion(input: AppendVersionInput): Promise<RegistryVersion> {
  const versionId = randomUUID();
  
  // Generate hash for new data
  const dataJson = JSON.stringify(input.data);
  const hash = createHash("sha256").update(dataJson).digest("hex");

  // Insert new version
  const newVersion = await prisma.registry_versions.create({
    data: {
      id: versionId,
      registry_id: input.registryId,
      data_json: input.data,
      submitted_by: input.submittedBy,
      hash: hash,
    },
  });

  // Log the update
  await logAccess({
    registryId: input.registryId,
    userId: null, // System action
    action: "UPDATED",
  });

  return newVersion;
}

/**
 * Get registry by ID with all versions and access logs
 * 
 * Returns the complete registry record with:
 * - All versions (ordered by creation time, newest first)
 * - Latest version (most recent)
 * - Access logs (ordered by timestamp, newest first)
 */
export async function getRegistryById(registryId: string): Promise<RegistryWithVersions> {
  // Fetch registry record
  const registry = await prisma.registry_records.findUnique({
    where: { id: registryId },
  });

  if (!registry) {
    throw new Error(`Registry not found: ${registryId}`);
  }

  // Fetch all versions (ordered by creation time, newest first)
  const versions = await prisma.registry_versions.findMany({
    where: { registry_id: registryId },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch access logs (ordered by timestamp, newest first)
  const logs = await prisma.access_logs.findMany({
    where: { registry_id: registryId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    id: registry.id,
    decedentName: registry.decedentName,
    status: registry.status as RegistryStatus,
    createdAt: registry.createdAt,
    versions: versions.map(v => ({
      id: v.id,
      registryId: v.registry_id,
      dataJson: v.data_json as Record<string, unknown>,
      submittedBy: v.submitted_by as RegistrySubmissionSource,
      hash: v.hash,
      createdAt: v.createdAt,
    })),
    latestVersion: versions[0] ? {
      id: versions[0].id,
      registryId: versions[0].registry_id,
      dataJson: versions[0].data_json as Record<string, unknown>,
      submittedBy: versions[0].submitted_by as RegistrySubmissionSource,
      hash: versions[0].hash,
      createdAt: versions[0].createdAt,
    } : null,
    accessLogs: logs.map(l => ({
      id: l.id,
      registryId: l.registry_id,
      userId: l.user_id,
      action: l.action as AccessLogAction,
      metadata: l.metadata as Record<string, unknown> | null,
      timestamp: l.createdAt,
    })),
  };
}

/**
 * Log access to a registry
 * 
 * Creates an audit trail entry for any action performed on a registry.
 * This is called automatically by createRegistry and appendRegistryVersion,
 * but can also be called explicitly for other actions (VIEWED, VERIFIED, etc.).
 */
/**
 * Log access to a registry
 * 
 * Every route handler must call this function.
 * This is where credibility lives - comprehensive audit trail.
 * 
 * Creates an audit trail entry for any action performed on a registry.
 * Includes user, registry, action, and optional metadata.
 */
export async function logAccess(input: LogAccessInput): Promise<AccessLog> {
  const logId = randomUUID();

  const log = await prisma.access_logs.create({
    data: {
      id: logId,
      registry_id: input.registryId,
      user_id: input.userId || null,
      action: input.action,
      metadata: input.metadata || null,
    },
  });

  return {
    id: log.id,
    registryId: log.registry_id,
    userId: log.user_id,
    action: log.action as AccessLogAction,
    metadata: log.metadata as Record<string, unknown> | null,
    timestamp: log.createdAt,
  };
}

/**
 * Get all registries with latest version summaries
 * 
 * Returns registries with their latest version data for dashboard display.
 * Only includes summary information, not full document details.
 */
export async function getAllRegistries(): Promise<Array<{
  id: string,
  decedentName: string,
  status: string,
  createdAt: Date;
  latestVersion: {
    id: string,
    createdAt: Date;
    submittedBy: string,
  } | null;
  versionCount: number;
  lastUpdated: Date | null;
}>> {
  // Fetch all registries with their latest version
  const registries = await prisma.registry_records.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      decedentName: true,
      status: true,
      createdAt: true,
    },
  });

  // For each registry, get latest version info
  const registriesWithVersions = await Promise.all(
    registries.map(async (registry) => {
      const latestVersion = await prisma.registry_versions.findFirst({
        where: { registry_id: registry.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          submitted_by: true,
        },
      });

      // Count versions for this registry
      const versionCount = await prisma.registry_versions.count({
        where: { registry_id: registry.id },
      });

      return {
        id: registry.id,
        decedentName: registry.decedentName,
        status: registry.status,
        createdAt: registry.createdAt,
        latestVersion: latestVersion ? {
          id: latestVersion.id,
          createdAt: latestVersion.createdAt,
          submittedBy: latestVersion.submitted_by,
        } : null,
        versionCount,
        lastUpdated: latestVersion?.createdAt || null,
      };
    })
  );

  return registriesWithVersions;
}

/**
 * Get registry version by ID with associated documents
 */
export async function getRegistryVersionById(versionId: string): Promise<RegistryVersionWithDocuments> {
  const version = await prisma.registry_versions.findUnique({
    where: { id: versionId },
  });

  if (!version) {
    throw new Error(`Registry version not found: ${versionId}`);
  }

  // Fetch associated documents using Prisma
  const docs = await prisma.documents.findMany({
    where: { registry_version_id: versionId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      file_name: true,
      storage_path: true,
      sha256: true,
      createdAt: true,
    },
  });

  return {
    id: version.id,
    registryId: version.registry_id,
    dataJson: version.data_json as Record<string, unknown>,
    submittedBy: version.submitted_by as RegistrySubmissionSource,
    hash: version.hash,
    createdAt: version.createdAt,
    documents: docs.map(doc => ({
      id: doc.id,
      fileName: doc.file_name,
      filePath: doc.storage_path,
      documentHash: doc.sha256,
      createdAt: doc.createdAt,
    })),
  };
}

