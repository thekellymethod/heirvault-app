import { verifyRegistryAccess } from "@/lib/permissions";
import { getRegistryById, logAccess } from "@/lib/db";
import { redirect } from "next/navigation";
import { RecordDetailView } from "./_components/RecordDetailView";
import { db, documents, inArray } from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Registry Record Detail Page
 * Protected route - requires authentication
 * 
 * Server Component
 * Verify access via /lib/permissions.ts
 * Fetch registry + versions
 * Display documents + hashes
 * Log view access
 */
export default async function RecordDetailPage({ params }: Props) {
  const { id } = await params;

  // Verify access (permission guard - reusable everywhere)
  const { user } = await verifyRegistryAccess(id);

  // Fetch registry with all versions
  let registry;
  try {
    registry = await getRegistryById(id);
  } catch (error) {
    console.error("Error loading registry:", error);
    redirect("/error?type=not_found");
  }

  // Fetch all documents across all versions
  // Get all version IDs
  const versionIds = registry.versions.map(v => v.id);
  
  // Fetch documents for all versions
  const allDocuments = versionIds.length > 0
    ? await db.select({
        id: documents.id,
        fileName: documents.fileName,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        filePath: documents.filePath,
        documentHash: documents.documentHash,
        registryVersionId: documents.registryVersionId,
        createdAt: documents.createdAt,
        verifiedAt: documents.verifiedAt,
      })
        .from(documents)
        .where(inArray(documents.registryVersionId, versionIds))
    : [];

  // Group documents by version
  const documentsByVersion = new Map<string, typeof allDocuments>();
  for (const doc of allDocuments) {
    if (doc.registryVersionId) {
      const versionDocs = documentsByVersion.get(doc.registryVersionId) || [];
      versionDocs.push(doc);
      documentsByVersion.set(doc.registryVersionId, versionDocs);
    }
  }

  // Log view access (legal backbone - every route handler must call this)
  // Audit: REGISTRY_VIEW
  await logAccess({
    registryId: id,
    userId: user.id,
    action: "REGISTRY_VIEW",
    metadata: {
      source: "record_detail_page",
      versionCount: registry.versions.length,
      documentCount: allDocuments.length,
      decedentName: registry.decedentName,
      status: registry.status,
    },
  });

  return (
    <RecordDetailView
      registry={registry}
      documentsByVersion={documentsByVersion}
      user={user}
    />
  );
}
