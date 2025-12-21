import { NextRequest, NextResponse } from "next/server";
import { requireAttorney } from "@/lib/auth";
import { db, registryRecords, registryVersions, logAccess } from "@/lib/db";
import { eq, desc, ilike } from "@/lib/db";

/**
 * Search API
 * Protected endpoint - requires authentication
 * 
 * Validate purpose
 * Run constrained query
 * Log intent + result count
 * 
 * Never allow free-text global search. Ever.
 */

// Valid search purposes (controlled list)
const VALID_PURPOSES = [
  "ESTATE_ADMINISTRATION",
  "BENEFICIARY_CLAIM",
  "POLICY_VERIFICATION",
  "LEGAL_PROCEEDING",
  "COMPLIANCE_AUDIT",
  "OTHER",
] as const;

type SearchPurpose = typeof VALID_PURPOSES[number];

interface SearchParams {
  purpose: string;
  decedentName?: string;
}

/**
 * Validate search purpose
 */
function validatePurpose(purpose: string): purpose is SearchPurpose {
  return VALID_PURPOSES.includes(purpose as SearchPurpose);
}

/**
 * GET /api/search
 * 
 * Controlled search endpoint - only allows constrained field searches
 */
export async function GET(req: NextRequest) {
  try {
    // Require attorney authentication
    const user = await requireAttorney();

    // Extract and validate search parameters
    const { searchParams } = new URL(req.url);
    const purpose = searchParams.get("purpose")?.trim();
    const decedentName = searchParams.get("decedentName")?.trim();

    // Validate purpose is provided
    if (!purpose) {
      return NextResponse.json(
        { error: "Search purpose is required" },
        { status: 400 }
      );
    }

    // Validate purpose is in allowed list
    if (!validatePurpose(purpose)) {
      return NextResponse.json(
        { 
          error: "Invalid search purpose",
          validPurposes: VALID_PURPOSES,
        },
        { status: 400 }
      );
    }

    // Validate at least one search field is provided
    if (!decedentName) {
      return NextResponse.json(
        { error: "At least one search field is required" },
        { status: 400 }
      );
    }

    // CRITICAL: Never allow free-text global search
    // Only search on specific, constrained fields
    // Build constrained query - only search decedent_name field
    const searchPattern = `%${decedentName.replace(/'/g, "''")}%`;

    // Query limited fields only - never expose full data in search results
    const registries = await db.select({
      id: registryRecords.id,
      decedentName: registryRecords.decedentName,
      status: registryRecords.status,
      createdAt: registryRecords.createdAt,
    })
      .from(registryRecords)
      .where(
        ilike(registryRecords.decedentName, searchPattern)
      )
      .orderBy(desc(registryRecords.createdAt))
      .limit(50); // Limit results to prevent data exposure

    // Get latest version info for each registry (summary only)
    const results = await Promise.all(
      registries.map(async (registry) => {
        const [latestVersion] = await db.select({
          submittedBy: registryVersions.submittedBy,
          createdAt: registryVersions.createdAt,
        })
          .from(registryVersions)
          .where(eq(registryVersions.registryId, registry.id))
          .orderBy(desc(registryVersions.createdAt))
          .limit(1);

        return {
          id: registry.id,
          decedentName: registry.decedentName,
          status: registry.status,
          createdAt: registry.createdAt,
          latestVersion: latestVersion || null,
        };
      })
    );

    const resultCount = results.length;

    // Log search intent + result count (critical for audit)
    // Audit: SEARCH_PERFORMED
    // Note: For searches, we use a special registryId "search" to indicate it's a search operation
    // This allows us to use the existing access_logs table while maintaining audit trail
    await logAccess({
      registryId: "search", // Special identifier for search operations
      userId: user.id,
      action: "SEARCH_PERFORMED",
      metadata: {
        source: "search_api",
        purpose,
        searchFields: { decedentName },
        resultCount,
        timestamp: new Date().toISOString(),
      },
    });

    // Return results (limited fields only - never full data)
    return NextResponse.json({
      success: true,
      results,
      resultCount,
      purpose,
      searchFields: {
        decedentName: decedentName || null,
      },
      message: `Search completed. Found ${resultCount} result${resultCount !== 1 ? "s" : ""}.`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in search:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to perform search" },
      { status: 500 }
    );
  }
}
