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
 * - Only searches across limited fields: insured_name, beneficiary_name, carrier_guess
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
    // Search in registry versions for: insured_name, beneficiary_name, carrier_guess
    // We'll search through versions and match registries
    const searchTerm = searchString.trim().toLowerCase();

    // Get all authorized registries for this user (respects permissions)
    const authorizedRegistries = await listAuthorizedRegistries(user.clerkId, 1000);
    
    // Filter by search term in authorized registries only
    const allRegistries = authorizedRegistries.filter((registry) => {
      // Basic name matching on registry record
      const decedentName = (registry.decedentName || "").toLowerCase();
      return decedentName.includes(searchTerm);
    });

    // Also search through versions for insured_name, beneficiary_name, carrier_guess
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

    for (const registry of allRegistries) {
      const versions = await getRegistryVersions(registry.id);
      const latestVersion = versions.length > 0 ? versions[0] : null;

      if (latestVersion) {
        const data = latestVersion.data_json as Record<string, unknown>;
        const insuredName = String(data.insured_name || "").toLowerCase();
        const beneficiaryName = String(data.beneficiary_name || "").toLowerCase();
        const carrierGuess = String(data.carrier_guess || "").toLowerCase();

        let matchedField: string | undefined;
        if (insuredName.includes(searchTerm)) {
          matchedField = "insured_name";
        } else if (beneficiaryName.includes(searchTerm)) {
          matchedField = "beneficiary_name";
        } else if (carrierGuess.includes(searchTerm)) {
          matchedField = "carrier_guess";
        }

        if (matchedField) {
          matchingRegistries.push({
            id: registry.id,
            decedentName: registry.decedentName,
            status: registry.status,
            createdAt: registry.createdAt,
            matchedField,
            redactedData: {
              insuredName: data.insured_name ? String(data.insured_name) : undefined,
              beneficiaryName: data.beneficiary_name ? String(data.beneficiary_name) : undefined,
              carrierGuess: data.carrier_guess ? String(data.carrier_guess) : undefined,
              policyNumber: maskPolicyNumber(data.policy_number_optional as string | null | undefined),
            },
          });
        }
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
        matchedFields: ["insured_name", "beneficiary_name", "carrier_guess"],
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
