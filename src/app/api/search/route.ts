import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedAttorneyWithClerkId } from "@/lib/auth/guards";
import { listAuthorizedRegistries, getRegistryVersions } from "@/lib/db";
import { logAccess } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Search API
 * 
 * Constrained search endpoint - requires authentication
 * 
 * - Validates purpose is non-empty
 * - Only searches across limited fields: decedent_name (from registry), insured_name, beneficiary_name, carrier_guess (from versions)
 * - Returns redacted results (no full policy numbers)
 * - Audits SEARCH_PERFORMED with purpose and resultCount
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

/**
 * Mask policy number for redaction
 * Shows only last 4 digits
 */
function maskPolicyNumber(policyNumber: string | null | undefined): string | null {
  if (!policyNumber) return null;
  if (policyNumber.length <= 4) return "****";
  return `****${policyNumber.slice(-4)}`;
}

/**
 * POST /api/search
 * 
 * Constrained search endpoint
 */
export async function POST(req: NextRequest) {
  try {
    // Require attorney authentication
    const user = await requireVerifiedAttorneyWithClerkId();

    // Parse request body
    const body = await req.json();
    const { purpose, searchString } = body;

    // Validate purpose is provided and non-empty
    if (!purpose || typeof purpose !== "string" || purpose.trim() === "") {
      return NextResponse.json(
        { error: "Search purpose is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate purpose is in allowed list
    if (!VALID_PURPOSES.includes(purpose as SearchPurpose)) {
      return NextResponse.json(
        {
          error: "Invalid search purpose",
          validPurposes: VALID_PURPOSES,
        },
        { status: 400 }
      );
    }

    // Validate search string is provided
    if (!searchString || typeof searchString !== "string" || searchString.trim() === "") {
      return NextResponse.json(
        { error: "Search string is required" },
        { status: 400 }
      );
    }

    // CRITICAL: Only search across limited fields
    // Search in registry records for: decedent_name
    // Search in registry versions for: insured_name, beneficiary_name, carrier_guess
    // We'll search through all authorized registries and their versions
    const searchTerm = searchString.trim().toLowerCase();

    // Get all authorized registries for this user (respects permissions)
    const authorizedRegistries = await listAuthorizedRegistries(user.clerkId, 1000);

    // Search through all authorized registries and their versions
    // Search fields: decedentName (from registry), insured_name, beneficiary_name, carrier_guess (from versions)
    // This is a simplified approach - in production, you'd want a more efficient query
    const matchingRegistries: Array<{
      id: string;
      decedentName: string;
      status: string;
      createdAt: Date;
      matchedField?: string;
      redactedData?: {
        insuredName?: string;
        beneficiaryName?: string;
        carrierGuess?: string;
        policyNumber?: string | null;
      };
    }> = [];

    for (const registry of authorizedRegistries) {
      // Check decedentName on the registry record first (no DB query needed)
      const decedentName = (registry.decedentName || "").toLowerCase();
      let matchedField: string | undefined;
      
      if (decedentName.includes(searchTerm)) {
        matchedField = "decedent_name";
      }

      // Only fetch version data if we need it:
      // 1. If not matched on decedentName, we need to check version fields
      // 2. If matched, we need version data for the redacted response
      let data: Record<string, unknown> | undefined;
      if (!matchedField || matchedField === "decedent_name") {
        const versions = await getRegistryVersions(registry.id);
        const latestVersion = versions.length > 0 ? versions[0] : null;
        data = latestVersion?.data_json as Record<string, unknown> | undefined;

        // If not matched on registry record, check version data
        if (!matchedField && data) {
          const insuredName = String(data.insured_name || "").toLowerCase();
          const beneficiaryName = String(data.beneficiary_name || "").toLowerCase();
          const carrierGuess = String(data.carrier_guess || "").toLowerCase();

          if (insuredName.includes(searchTerm)) {
            matchedField = "insured_name";
          } else if (beneficiaryName.includes(searchTerm)) {
            matchedField = "beneficiary_name";
          } else if (carrierGuess.includes(searchTerm)) {
            matchedField = "carrier_guess";
          }
        }
      }

      // If matched, add to results with redacted data
      if (matchedField) {
        matchingRegistries.push({
          id: registry.id,
          decedentName: registry.decedentName,
          status: registry.status,
          createdAt: registry.createdAt,
          matchedField,
          redactedData: data
            ? {
                insuredName: data.insured_name ? String(data.insured_name) : undefined,
                beneficiaryName: data.beneficiary_name ? String(data.beneficiary_name) : undefined,
                carrierGuess: data.carrier_guess ? String(data.carrier_guess) : undefined,
                policyNumber: maskPolicyNumber(data.policy_number_optional as string | null | undefined),
              }
            : undefined,
        });
      }
    }

    const resultCount = matchingRegistries.length;

    // Audit: SEARCH_PERFORMED with purpose and resultCount
    await logAccess({
      userId: user.id,
      registryId: "system", // System-wide search operation
      action: "SEARCH_PERFORMED",
      metadata: {
        source: "search_api",
        purpose,
        searchString: searchTerm,
        resultCount,
        matchedFields: ["decedent_name", "insured_name", "beneficiary_name", "carrier_guess"],
        timestamp: new Date().toISOString(),
      },
    });

    // Return redacted results (no full policy numbers)
    return NextResponse.json({
      success: true,
      results: matchingRegistries,
      resultCount,
      purpose,
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
