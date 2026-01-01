import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { backfillDocumentCategories, getCategoryStats } from "@/lib/documents/backfill-categories";

/**
 * POST /api/admin/backfill-document-categories
 * 
 * Admin-only endpoint to backfill document categories for legacy documents.
 * Requires admin authentication.
 */
export async function POST(req: NextRequest) {
  try {
    // Require admin access
    await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 100;

    const updated = await backfillDocumentCategories(batchSize);

    return NextResponse.json({
      success: true,
      updated,
      message: `Backfilled categories for ${updated} documents`,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Admin access required")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    console.error("Error backfilling document categories:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to backfill categories" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/backfill-document-categories
 * 
 * Get statistics on document category distribution.
 */
export async function GET() {
  try {
    // Require admin access
    await requireAdmin();

    const stats = await getCategoryStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Admin access required")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    console.error("Error fetching category stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch category stats" },
      { status: 500 }
    );
  }
}
