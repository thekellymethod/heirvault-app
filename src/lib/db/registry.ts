import { db, registryRecords, registryVersions, accessLogs, documents, type RegistryRecord, type RegistryVersion, type AccessLog, type RegistryStatus, type RegistrySubmissionSource, type AccessLogAction, eq, desc, sql } from "./index";
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
    id: string;
    fileName: string;
    filePath: string;
    documentHash: string;
    createdAt: Date;
  }>;
};

export type CreateRegistryInput = {
  decedentName: string;
  status?: RegistryStatus;
  initialData: Record<string, unknown>; // JSON data for first version
  submittedBy: RegistrySubmissionSource;
};

export type AppendVersionInput = {
  registryId: string;
  data: Record<string, unknown>; // JSON data for new version
  submittedBy: RegistrySubmissionSource;
};

export type LogAccessInput = {
  registryId: string;
  userId?: string | null; // null for system actions
  action: AccessLogAction;
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
  await db.transaction(async (tx) => {
    // Insert registry record
    await tx.insert(registryRecords).values({
      id: registryId,
      decedentName: input.decedentName,
      status: input.status || "PENDING_VERIFICATION",
    });

    // Insert first version
    await tx.insert(registryVersions).values({
      id: versionId,
      registryId,
      dataJson: input.initialData,
      submittedBy: input.submittedBy,
      hash,
    });

    // Log creation
    await tx.insert(accessLogs).values({
      id: randomUUID(),
      registryId,
      userId: null, // System action
      action: "CREATED",
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
  const [newVersion] = await db.insert(registryVersions)
    .values({
      id: versionId,
      registryId: input.registryId,
      dataJson: input.data,
      submittedBy: input.submittedBy,
      hash,
    })
    .returning();

  if (!newVersion) {
    throw new Error("Failed to create registry version");
  }

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
  const [registry] = await db.select()
    .from(registryRecords)
    .where(eq(registryRecords.id, registryId))
    .limit(1);

  if (!registry) {
    throw new Error(`Registry not found: ${registryId}`);
  }

  // Fetch all versions (ordered by creation time, newest first)
  const versions = await db.select()
    .from(registryVersions)
    .where(eq(registryVersions.registryId, registryId))
    .orderBy(desc(registryVersions.createdAt));

  // Fetch access logs (ordered by timestamp, newest first)
  const logs = await db.select()
    .from(accessLogs)
    .where(eq(accessLogs.registryId, registryId))
    .orderBy(desc(accessLogs.timestamp));

  return {
    ...registry,
    versions,
    latestVersion: versions[0] || null,
    accessLogs: logs,
  };
}

/**
 * Log access to a registry
 * 
 * Creates an audit trail entry for any action performed on a registry.
 * This is called automatically by createRegistry and appendRegistryVersion,
 * but can also be called explicitly for other actions (VIEWED, VERIFIED, etc.).
 */
export async function logAccess(input: LogAccessInput): Promise<AccessLog> {
  const logId = randomUUID();

  const [log] = await db.insert(accessLogs)
    .values({
      id: logId,
      registryId: input.registryId,
      userId: input.userId || null,
      action: input.action,
    })
    .returning();

  if (!log) {
    throw new Error("Failed to create access log");
  }

  return log;
}

/**
 * Get all registries with latest version summaries
 * 
 * Returns registries with their latest version data for dashboard display.
 * Only includes summary information, not full document details.
 */
export async function getAllRegistries(): Promise<Array<{
  id: string;
  decedentName: string;
  status: string;
  createdAt: Date;
  latestVersion: {
    id: string;
    createdAt: Date;
    submittedBy: string;
  } | null;
  versionCount: number;
  lastUpdated: Date | null;
}>> {
  // Fetch all registries with their latest version
  const registries = await db.select({
    id: registryRecords.id,
    decedentName: registryRecords.decedentName,
    status: registryRecords.status,
    createdAt: registryRecords.createdAt,
  })
    .from(registryRecords)
    .orderBy(desc(registryRecords.createdAt));

  // For each registry, get latest version info
  const registriesWithVersions = await Promise.all(
    registries.map(async (registry) => {
      const [latestVersion] = await db.select({
        id: registryVersions.id,
        createdAt: registryVersions.createdAt,
        submittedBy: registryVersions.submittedBy,
      })
        .from(registryVersions)
        .where(eq(registryVersions.registryId, registry.id))
        .orderBy(desc(registryVersions.createdAt))
        .limit(1);

      // Count versions for this registry
      const versionCountResult = await db.execute(sql`
        SELECT COUNT(*)::int as count
        FROM registry_versions
        WHERE registry_id = ${registry.id}
      `);
      const versionCount = (versionCountResult.rows[0] as { count: number })?.count || 0;

      return {
        id: registry.id,
        decedentName: registry.decedentName,
        status: registry.status,
        createdAt: registry.createdAt,
        latestVersion: latestVersion ? {
          id: latestVersion.id,
          createdAt: latestVersion.createdAt,
          submittedBy: latestVersion.submittedBy,
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
  const [version] = await db.select()
    .from(registryVersions)
    .where(eq(registryVersions.id, versionId))
    .limit(1);

  if (!version) {
    throw new Error(`Registry version not found: ${versionId}`);
  }

  // Fetch associated documents using Drizzle
  const docs = await db.select({
    id: documents.id,
    fileName: documents.fileName,
    filePath: documents.filePath,
    documentHash: documents.documentHash,
    createdAt: documents.createdAt,
  })
    .from(documents)
    .where(eq(documents.registryVersionId, versionId))
    .orderBy(desc(documents.createdAt));

  return {
    ...version,
    documents: docs.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      filePath: doc.filePath,
      documentHash: doc.documentHash,
      createdAt: doc.createdAt,
    })),
  };
}

