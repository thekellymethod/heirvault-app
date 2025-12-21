"use client";

import { useState } from "react";
import { type User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  FileText,
  AlertCircle,
  Loader2,
  Shield,
  CheckCircle,
} from "lucide-react";

interface SearchViewProps {
  user: User;
}

interface SearchResult {
  id: string;
  decedentName: string;
  status: string;
  createdAt: Date;
  latestVersion: {
    submittedBy: string;
    createdAt: Date;
  } | null;
}

/**
 * Search View Component
 * 
 * Controlled exposure search - requires purpose and uses constrained queries only.
 * Never allows free-text global search.
 */
export function SearchView({ user }: SearchViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchPurpose, setSearchPurpose] = useState("");
  const [decedentName, setDecedentName] = useState("");
  const [resultCount, setResultCount] = useState<number | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);
    setResultCount(null);

    // Validate purpose is provided
    if (!searchPurpose.trim()) {
      setError("Search purpose is required. Please explain why you are searching.");
      return;
    }

    // Validate at least one search field is provided
    if (!decedentName.trim()) {
      setError("At least one search field is required.");
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("purpose", searchPurpose.trim());
      if (decedentName.trim()) {
        params.set("decedentName", decedentName.trim());
      }

      const res = await fetch(`/api/search?${params.toString()}`, {
        method: "GET",
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
            Controlled search with purpose-driven queries. Limited fields only.
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
                All searches are logged and require a stated purpose. Free-text global search is not permitted.
                Only specific, constrained field searches are allowed.
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
            <Input
              id="searchPurpose"
              type="text"
              required
              value={searchPurpose}
              onChange={(e) => setSearchPurpose(e.target.value)}
              placeholder="e.g., Locating policy for estate administration, Verifying policy existence for beneficiary claim"
              className="w-full"
            />
            <p className="text-xs text-slateui-500 mt-1">
              Explain why you are performing this search. This will be logged for audit purposes.
            </p>
          </div>

          <div className="border-t border-slateui-200 pt-4">
            <h3 className="text-sm font-medium text-ink-900 mb-3">
              Search Criteria (At least one required)
            </h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="decedentName" className="block text-sm font-medium text-ink-900 mb-1">
                  Decedent Name
                </label>
                <Input
                  id="decedentName"
                  type="text"
                  value={decedentName}
                  onChange={(e) => setDecedentName(e.target.value)}
                  placeholder="Full name of the decedent"
                />
              </div>
            </div>
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
              disabled={loading || !searchPurpose.trim() || !decedentName.trim()}
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
                        <h3 className="font-medium text-ink-900 mb-1">
                          {result.decedentName}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-slateui-600">
                          <span>Status: {result.status.replace("_", " ")}</span>
                          {result.latestVersion && (
                            <span>
                              Last updated: {new Date(result.latestVersion.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slateui-500 font-mono mt-2">
                          Registry ID: {result.id}
                        </p>
                      </div>
                      <a
                        href={`/records/${result.id}`}
                        className="btn-primary text-sm"
                      >
                        View Details
                      </a>
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

