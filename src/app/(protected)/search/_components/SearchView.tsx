"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  FileText,
  AlertCircle,
  Loader2,
  Shield,
} from "lucide-react";
import Link from "next/link";

interface SearchResult {
  id: string,
  decedentName: string,
  status: string,
  createdAt: Date;
  matchedField?: string,
  redactedData?: {
    insuredName?: string,
    beneficiaryName?: string,
    carrierGuess?: string,
    policyNumber?: string | null;
  };
}

/**
 * Search View Component
 * 
 * Constrained search - requires purpose dropdown and search string.
 * Only searches across limited fields: insured_name, beneficiary_name, carrier_guess.
 * Returns redacted results (no full policy numbers).
 */
export function SearchView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchPurpose, setSearchPurpose] = useState("");
  const [searchString, setSearchString] = useState("");
  const [resultCount, setResultCount] = useState<number | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);
    setResultCount(null);

    // Validate purpose is provided
    if (!searchPurpose.trim()) {
      setError("Search purpose is required. Please select a purpose from the dropdown.");
      return;
    }

    // Validate search string is provided
    if (!searchString.trim()) {
      setError("Search string is required. Enter a name or carrier to search for.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purpose: searchPurpose.trim(),
          searchString: searchString.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Search failed");

      setResults(data.results || []);
      setResultCount(data.resultCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-50 py-6">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
            Search & Discovery
          </h1>
          <p className="text-slateui-600">
            Constrained search across limited fields. All searches are logged for audit purposes.
          </p>
        </div>

        {/* Security Notice */}
        <div className="card p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink-900 mb-1">
                Controlled Search Access
              </p>
              <p className="text-sm text-slateui-600">
                This search only queries: Insured Name, Beneficiary Name, and Carrier Guess.
                Policy numbers are redacted in results. All searches are logged with your stated purpose.
              </p>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="card p-6 mb-6 space-y-4">
          <div>
            <label htmlFor="searchPurpose" className="block text-sm font-medium text-ink-900 mb-1">
              Search Purpose <span className="text-red-500">*</span>
            </label>
            <select
              id="searchPurpose"
              required
              value={searchPurpose}
              onChange={(e) => setSearchPurpose(e.target.value)}
              className="w-full rounded-md border border-slateui-200 bg-white px-3 py-2 text-sm focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
              aria-label="Search purpose"
            >
              <option value="">Select a purpose...</option>
              <option value="ESTATE_ADMINISTRATION">Estate Administration</option>
              <option value="BENEFICIARY_CLAIM">Beneficiary Claim</option>
              <option value="POLICY_VERIFICATION">Policy Verification</option>
              <option value="LEGAL_PROCEEDING">Legal Proceeding</option>
              <option value="COMPLIANCE_AUDIT">Compliance Audit</option>
              <option value="OTHER">Other (specify in notes)</option>
            </select>
            <p className="text-xs text-slateui-500 mt-1">
              Select the purpose for this search. This will be logged for audit purposes.
            </p>
          </div>

          <div>
            <label htmlFor="searchString" className="block text-sm font-medium text-ink-900 mb-1">
              Search String <span className="text-red-500">*</span>
            </label>
            <Input
              id="searchString"
              type="text"
              required
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              placeholder="Search by insured name, beneficiary name, or carrier..."
            />
            <p className="text-xs text-slateui-500 mt-1">
              Searches across: Insured Name, Beneficiary Name, Carrier Guess
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || !searchPurpose.trim() || !searchString.trim()}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Results */}
        {resultCount !== null && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-ink-900">
                Search Results
              </h2>
              <span className="text-sm text-slateui-600">
                {resultCount} result{resultCount !== 1 ? "s" : ""} found
              </span>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-12 text-slateui-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slateui-400" />
                <p>No registries found matching your search criteria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="border border-slateui-200 rounded-lg p-4 hover:bg-slateui-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-ink-900 mb-2">
                          {result.decedentName}
                        </h3>
                        
                        {result.redactedData && (
                          <div className="space-y-1 text-sm text-slateui-600 mb-2">
                            {result.redactedData.insuredName && (
                              <div>
                                <span className="font-medium">Insured:</span> {result.redactedData.insuredName}
                              </div>
                            )}
                            {result.redactedData.beneficiaryName && (
                              <div>
                                <span className="font-medium">Beneficiary:</span> {result.redactedData.beneficiaryName}
                              </div>
                            )}
                            {result.redactedData.carrierGuess && (
                              <div>
                                <span className="font-medium">Carrier:</span> {result.redactedData.carrierGuess}
                              </div>
                            )}
                            {result.redactedData.policyNumber && (
                              <div>
                                <span className="font-medium">Policy Number:</span> {result.redactedData.policyNumber}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-slateui-600">
                          <span>Status: {result.status.replace("_", " ")}</span>
                          {result.matchedField && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Matched: {result.matchedField.replace("_", " ")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slateui-500 font-mono mt-2">
                          Registry ID: {result.id}
                        </p>
                      </div>
                      <Link
                        href={`/records/${result.id}`}
                        className="btn-primary text-sm whitespace-nowrap ml-4"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
