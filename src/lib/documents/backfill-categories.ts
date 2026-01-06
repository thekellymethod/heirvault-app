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
  let updated = 0;
  let hasMore = true;

  while (hasMore) {
    // Find documents without category
    const documents = await prisma.documents.findMany({
      where: {
        documentCategory: null,
      },
      select: {
        id: true,
        fileType: true,
      },
      take: batchSize,
    });

    if (documents.length === 0) {
      hasMore = false;
      break;
    }

    // Update each document with mapped category
    for (const doc of documents) {
      const category = getDocumentCategory(doc.fileType, null);
      
      if (category) {
        await prisma.documents.update({
          where: { id: doc.id },
          data: { documentCategory: category },
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
  const stats = await prisma.documents.groupBy({
    by: ["documentCategory"],
    _count: {
      id: true,
    },
  });

  return stats.map((stat) => ({
    category: stat.documentCategory || "UNCATEGORIZED",
    count: stat._count.id,
  }));
}
