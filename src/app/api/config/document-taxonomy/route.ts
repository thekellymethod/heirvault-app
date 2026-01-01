import { NextResponse } from "next/server";
import { getTaxonomyConfig } from "@/lib/documents/taxonomy";

/**
 * GET /api/config/document-taxonomy
 * 
 * Returns read-only document taxonomy configuration.
 * This endpoint can be tier-gated in the future without changing the response structure.
 */
export async function GET() {
  try {
    const taxonomy = getTaxonomyConfig();

    return NextResponse.json(taxonomy, {
      headers: {
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error fetching document taxonomy:", error);
    return NextResponse.json(
      { error: "Failed to fetch taxonomy" },
      { status: 500 }
    );
  }
}
