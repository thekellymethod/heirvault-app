/**
 * Backfill Document Categories
 * 
 * Utility to safely backfill document categories for legacy documents.
 * This can be run as a one-time migration or scheduled job.
 */

;
import { getDocumentCategory } from "./taxonomy";

/**
 * Backfill categories for documents that don't have one
 * Returns count of documents updated
 */
export async function backfillDocumentCategories(batchSize: number = 100): Promise<number> {
  const { update: updateDb, getDb } = await import("@/lib/db");
  const db = getDb();
  
  let updated = 0;
  let hasMore = true;

  while (hasMore) {
    // Find documents without category
    const { data: documents } = await db
      .from("documents")
      .select("id, fileType")
      .is("documentCategory", null)
      .limit(batchSize);

    if (!documents || documents.length === 0) {
      hasMore = false;
      break;
    }

    // Update each document with mapped category
    for (const doc of documents as Array<{ id: string; fileType: string | null }>) {
      const category = getDocumentCategory(doc.fileType, null);
      
      if (category) {
        await updateDb("documents", { id: doc.id }, {
          documentCategory: category,
          updatedAt: new Date().toISOString(),
        });
        updated++;
      }
    }

    // If we got fewer than batchSize, we're done
    if (documents.length < batchSize) {
      hasMore = false;
    }
  }

  return updated;
}

/**
 * Get statistics on category distribution
 */
export async function getCategoryStats() {
  // Use raw SQL for groupBy since Supabase doesn't have groupBy helper
  const { queryRaw } = await import("@/lib/db");
  const statsResult = await queryRaw<{
    documentCategory: string | null;
    count: number;
  }>(
    `SELECT 
      document_category as "documentCategory",
      COUNT(*)::int as count
    FROM documents
    GROUP BY document_category`,
    []
  );

  // queryRaw returns an array
  const stats = Array.isArray(statsResult) ? statsResult : [];

  if (stats.length === 0) {
    return [];
  }

  return stats.map((stat: { documentCategory: string | null; count: number }) => ({
    category: stat.documentCategory || "UNCATEGORIZED",
    count: stat.count,
  }));
}
