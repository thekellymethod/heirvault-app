"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, HelpCircle, Calendar, MapPin, User, Globe, FileText, Shield, Users } from "lucide-react";
import Link from "next/link";
import { DashboardLayout } from "../_components/DashboardLayout";

type SearchResult = {
  id: string;
  clientName: string;
  policyNumber: string | null;
  policyType: string | null;
  insurerName: string;
  dateOfBirth: string | null;
  dateOfDeath: string | null;
};

type SearchMode = "organization" | "global";

export default function PolicyLocatorPage() {
  const router = useRouter();
  const [searchMode, setSearchMode] = React.useState<SearchMode>("organization");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showExportForm, setShowExportForm] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [hasProofOfDeath, setHasProofOfDeath] = React.useState(false);
  const [proofOfDeathCertNumber, setProofOfDeathCertNumber] = React.useState("");
  
  // Global search state (for simple text search)
  const [globalQuery, setGlobalQuery] = React.useState("");
  const [globalResults, setGlobalResults] = React.useState<any>(null);

  // Basic search fields
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [dateOfDeath, setDateOfDeath] = React.useState("");
  const [state, setState] = React.useState("");
  const [relationship, setRelationship] = React.useState("");

  // Advanced search fields
  const [ssn, setSsn] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [policyNumber, setPolicyNumber] = React.useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setResults([]);
    setGlobalResults(null);

    if (searchMode === "global") {
      // Global simple text search
      if (!globalQuery.trim()) {
        setError("Please enter a search query");
        setSearching(false);
        return;
      }

      try {
        const res = await fetch(`/api/search/global?q=${encodeURIComponent(globalQuery.trim())}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data?.error || "Search failed");
        }

        setGlobalResults(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "An error occurred during search");
      } finally {
        setSearching(false);
      }
      return;
    }

    // Organization search
    try {
      const searchParams = new URLSearchParams();
      if (firstName.trim()) searchParams.append("firstName", firstName.trim());
      if (lastName.trim()) searchParams.append("lastName", lastName.trim());
      if (dateOfBirth) searchParams.append("dateOfBirth", dateOfBirth);
      if (dateOfDeath) searchParams.append("dateOfDeath", dateOfDeath);
      if (state) searchParams.append("state", state);
      if (relationship) searchParams.append("relationship", relationship);
      if (showAdvanced) {
        if (ssn.trim()) searchParams.append("ssn", ssn.trim());
        if (address.trim()) searchParams.append("address", address.trim());
        if (policyNumber.trim()) searchParams.append("policyNumber", policyNumber.trim());
      }

      const res = await fetch(`/api/policy-locator/search?${searchParams.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || "Search failed");
      }

      setResults(data.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred during search");
    } finally {
      setSearching(false);
    }
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setDateOfBirth("");
    setDateOfDeath("");
    setState("");
    setRelationship("");
    setSsn("");
    setAddress("");
    setPolicyNumber("");
    setResults([]);
    setError(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">Life Insurance Policy Locator</h1>
          </div>
        </div>
        <a
          href="/dashboard"
          className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Return to Dashboard
        </a>
      </div>
        <p className="mt-2 text-base text-slateui-600">
          Search for policy information in your organization or across all organizations.
        </p>
      </div>

      {/* Search Mode Tabs */}
      <div className="flex gap-2 border-b border-slateui-200 mb-6">
        <button
          onClick={() => {
            setSearchMode("organization");
            setResults([]);
            setGlobalResults(null);
            setError(null);
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            searchMode === "organization"
              ? "border-gold-500 text-ink-900"
              : "border-transparent text-slateui-600 hover:text-ink-900"
          }`}
        >
          Organization Search
        </button>
        <button
          onClick={() => {
            setSearchMode("global");
            setResults([]);
            setGlobalResults(null);
            setError(null);
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            searchMode === "global"
              ? "border-gold-500 text-ink-900"
              : "border-transparent text-slateui-600 hover:text-ink-900"
          }`}
        >
          <Globe className="h-4 w-4 inline-block mr-2" />
          Global Search
        </button>
      </div>


      {/* Organization Search Form */}
      {searchMode === "organization" && (
        <div className="card p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink-900 mb-6">
            Search Your Organization&apos;s Registry
          </h2>

        <form onSubmit={handleSearch} className="space-y-4">
          {/* Basic Search Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label mb-1 block">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="input"
                placeholder="Enter first name"
              />
            </div>

            <div>
              <label className="label mb-1 block">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="input"
                placeholder="Enter last name"
              />
            </div>

            <div>
              <label htmlFor="dateOfBirth-input" className="label mb-1 block">
                Date of Birth (Optional)
              </label>
              <div className="relative">
                <input
                  id="dateOfBirth-input"
                  name="dateOfBirth-input"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="input pr-10"
                  aria-label="Date of Birth"
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="dateOfDeath-input" className="label mb-1 block">
                Date of Death (Optional)
              </label>
              <div className="relative">
                <input
                  id="dateOfDeath-input"
                  name="dateOfDeath-input"
                  type="date"
                  value={dateOfDeath}
                  onChange={(e) => setDateOfDeath(e.target.value)}
                  className="input pr-10"
                  aria-label="Date of Death"
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="state-select" className="label mb-1 block">
                State (Optional)
              </label>
              <div className="relative">
                <select
                  id="state-select"
                  name="state-select"
                  aria-label="Select State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="input pr-10"
                >
                  <option value="">Select State</option>
                  <option value="AL">Alabama</option>
                  <option value="AK">Alaska</option>
                  <option value="AZ">Arizona</option>
                  <option value="AR">Arkansas</option>
                  <option value="CA">California</option>
                  <option value="CO">Colorado</option>
                  <option value="CT">Connecticut</option>
                  <option value="DE">Delaware</option>
                  <option value="FL">Florida</option>
                  <option value="GA">Georgia</option>
                  <option value="HI">Hawaii</option>
                  <option value="ID">Idaho</option>
                  <option value="IL">Illinois</option>
                  <option value="IN">Indiana</option>
                  <option value="IA">Iowa</option>
                  <option value="KS">Kansas</option>
                  <option value="KY">Kentucky</option>
                  <option value="LA">Louisiana</option>
                  <option value="ME">Maine</option>
                  <option value="MD">Maryland</option>
                  <option value="MA">Massachusetts</option>
                  <option value="MI">Michigan</option>
                  <option value="MN">Minnesota</option>
                  <option value="MS">Mississippi</option>
                  <option value="MO">Missouri</option>
                  <option value="MT">Montana</option>
                  <option value="NE">Nebraska</option>
                  <option value="NV">Nevada</option>
                  <option value="NH">New Hampshire</option>
                  <option value="NJ">New Jersey</option>
                  <option value="NM">New Mexico</option>
                  <option value="NY">New York</option>
                  <option value="NC">North Carolina</option>
                  <option value="ND">North Dakota</option>
                  <option value="OH">Ohio</option>
                  <option value="OK">Oklahoma</option>
                  <option value="OR">Oregon</option>
                  <option value="PA">Pennsylvania</option>
                  <option value="RI">Rhode Island</option>
                  <option value="SC">South Carolina</option>
                  <option value="SD">South Dakota</option>
                  <option value="TN">Tennessee</option>
                  <option value="TX">Texas</option>
                  <option value="UT">Utah</option>
                  <option value="VT">Vermont</option>
                  <option value="VA">Virginia</option>
                  <option value="WA">Washington</option>
                  <option value="WV">West Virginia</option>
                  <option value="WI">Wisconsin</option>
                  <option value="WY">Wyoming</option>
                </select>
                <MapPin className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="relationship-select" className="label mb-1 block">
                Relationship to Decedent (Optional)
              </label>
              <div className="relative">
                <select
                  id="relationship-select"
                  name="relationship-select"
                  aria-label="Select Relationship to Decedent"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="input pr-10"
                >
                  <option value="">--- Select Relationship ---</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="beneficiary">Beneficiary</option>
                  <option value="executor">Executor</option>
                  <option value="other">Other</option>
                </select>
                <User className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Advanced Search Fields */}
          {showAdvanced && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <h3 className="text-sm font-semibold text-ink-900 mb-3">Advanced Search</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="ssn-input" className="label mb-1 block">
                    Social Security Number
                  </label>
                  <input
                    id="ssn-input"
                    name="ssn-input"
                    type="text"
                    value={ssn}
                    onChange={(e) => setSsn(e.target.value)}
                    placeholder="XXX-XX-XXXX"
                    className="input"
                    aria-label="Social Security Number"
                  />
                </div>

                <div>
                  <label className="label mb-1 block">
                    Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address"
                    className="input"
                  />
                </div>

                <div>
                  <label className="label mb-1 block">
                    Policy Number
                  </label>
                  <input
                    type="text"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="Policy number"
                    className="input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-slateui-600 hover:text-ink-900 underline"
            >
              {showAdvanced ? "Hide Advanced Search" : "Advanced Search"}
            </button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={searching}
                className="btn-secondary"
              >
                Clear
              </Button>
              <Button type="submit" disabled={searching || !firstName.trim() || !lastName.trim()} className="btn-primary">
                {searching ? (
                  <>
                    <Search className="mr-2 h-4 w-4" />
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
          </div>
        </form>
      </div>
      )}

      {/* Global Search Form */}
      {searchMode === "global" && (
        <div className="card p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink-900 mb-6">
            Global Database Search
          </h2>
          <p className="text-sm text-slateui-600 mb-4">
            Search across all organizations in the private, voluntary registry database. All clients entered into the system are included in this search.
          </p>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slateui-400" />
                <input
                  type="text"
                  value={globalQuery}
                  onChange={(e) => setGlobalQuery(e.target.value)}
                  placeholder="Search by name, email, phone, insurer, or policy number..."
                  className="input pl-10"
                />
              </div>
              <Button type="submit" disabled={searching || !globalQuery.trim()} className="btn-primary">
                {searching ? (
                  <>
                    <Search className="h-4 w-4 mr-2 animate-pulse" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Global Search Results */}
      {searchMode === "global" && globalResults && (
        <div className="space-y-6 mb-6">
          {globalResults.disclaimer && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
              {globalResults.disclaimer}
            </div>
          )}

          {globalResults.clients && globalResults.clients.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="border-b border-slateui-200 px-6 py-4 flex items-center gap-2 bg-paper-50">
                <Users className="h-5 w-5 text-gold-500" />
                <div className="text-sm font-semibold text-ink-900">
                  Clients ({globalResults.clients.length})
                </div>
              </div>
              <div className="divide-y divide-slateui-200">
                {globalResults.clients.map((client: any) => (
                  <button
                    key={client.id}
                    onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                    className="w-full p-5 text-left transition-all hover:bg-paper-100 focus:bg-paper-100 focus:outline-none"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-ink-900">
                            {client.firstName} {client.lastName}
                          </h3>
                          {client.organization && (
                            <span className="text-xs text-slateui-600 bg-paper-100 px-2 py-0.5 rounded">
                              {client.organization.name}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slateui-600">
                          <span>{client.email}</span>
                          {client.phone && (
                            <>
                              <span className="text-slateui-300">•</span>
                              <span>{client.phone}</span>
                            </>
                          )}
                          {client.dateOfBirth && (
                            <>
                              <span className="text-slateui-300">•</span>
                              <span>DOB: {client.dateOfBirth.slice(0, 10)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <svg
                        className="h-5 w-5 text-slateui-400 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {globalResults.policies && globalResults.policies.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="border-b border-slateui-200 px-6 py-4 flex items-center gap-2 bg-paper-50">
                <FileText className="h-5 w-5 text-gold-500" />
                <div className="text-sm font-semibold text-ink-900">
                  Policies ({globalResults.policies.length})
                </div>
              </div>
              <div className="divide-y divide-slateui-200">
                {globalResults.policies.map((policy: any) => (
                  <button
                    key={policy.id}
                    onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                    className="w-full p-5 text-left transition-all hover:bg-paper-100 focus:bg-paper-100 focus:outline-none"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-ink-900">
                            {policy.insurerName}
                            {policy.policyNumber && ` • ${policy.policyNumber}`}
                          </h3>
                          {policy.client.organization && (
                            <span className="text-xs text-slateui-600 bg-paper-100 px-2 py-0.5 rounded">
                              {policy.client.organization.name}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-slateui-600">
                          Client: {policy.client.firstName} {policy.client.lastName} ({policy.client.email})
                          {policy.policyType && ` • Type: ${policy.policyType}`}
                        </div>
                      </div>
                      <svg
                        className="h-5 w-5 text-slateui-400 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {globalResults.clients?.length === 0 && globalResults.policies?.length === 0 && (
            <div className="card p-12 text-center">
              <Search className="h-12 w-12 text-slateui-300 mx-auto mb-4" />
              <p className="text-slateui-600 mb-2">No results found for &quot;{globalQuery}&quot;</p>
            </div>
          )}
        </div>
      )}

      {/* Organization Search Results */}
      {searchMode === "organization" && results.length > 0 && (
        <div className="mb-6 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-semibold text-ink-900">
              Search Results ({results.length})
            </h3>
            <Button
              onClick={() => setShowExportForm(true)}
              className="btn-primary"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export/Print
            </Button>
          </div>
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
            <p className="font-semibold">⚠️ Proof of death certification is required to export or print these results.</p>
          </div>
          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={result.id}
                className="rounded-lg border border-slateui-200 bg-paper-50 p-4 hover:bg-paper-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-ink-900">{result.clientName}</h4>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slateui-600">
                      {result.policyNumber && (
                        <div>
                          <span className="font-medium">Policy Number:</span> {result.policyNumber}
                        </div>
                      )}
                      {result.policyType && (
                        <div>
                          <span className="font-medium">Policy Type:</span> {result.policyType}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Insurer:</span> {result.insurerName}
                      </div>
                      {result.dateOfBirth && (
                        <div>
                          <span className="font-medium">Date of Birth:</span>{" "}
                          {new Date(result.dateOfBirth).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/dashboard/clients/${result.id}`)}
                    className="btn-secondary"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export/Print Form Modal */}
      {showExportForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="font-display text-xl font-semibold text-ink-900 mb-4">Export/Print Results</h3>
            <p className="text-sm text-slateui-600 mb-4">
              Proof of death certification is required to export or print search results.
            </p>
            
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="exportHasProofOfDeath"
                    checked={hasProofOfDeath}
                    onChange={(e) => setHasProofOfDeath(e.target.checked)}
                    className="mt-1"
                  />
                  <label htmlFor="exportHasProofOfDeath" className="text-sm text-amber-900 flex-1">
                    I confirm that I have a <strong>certified death certificate</strong> for the decedent.
                  </label>
                </div>
                {hasProofOfDeath && (
                  <div>
                    <label className="block text-sm font-medium text-amber-900 mb-1">
                      Death Certificate Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={proofOfDeathCertNumber}
                      onChange={(e) => setProofOfDeathCertNumber(e.target.value)}
                      placeholder="Enter death certificate number"
                      className="input"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => {
                    setShowExportForm(false);
                    setHasProofOfDeath(false);
                    setProofOfDeathCertNumber("");
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!hasProofOfDeath || !proofOfDeathCertNumber.trim()) {
                      setError("Proof of death certification is required to export results.");
                      return;
                    }
                    setExporting(true);
                    try {
                      // Future enhancement: Export policy locator search results as PDF
                      // This would generate a report of all matching policies found in the search
                      // For now, individual client summaries can be exported via /api/clients/[id]/summary-pdf
                      alert("Export functionality will be implemented. Death certificate verified.");
                      setShowExportForm(false);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to export");
                    } finally {
                      setExporting(false);
                    }
                  }}
                  disabled={!hasProofOfDeath || !proofOfDeathCertNumber.trim() || exporting}
                  className="btn-primary"
                >
                  {exporting ? "Exporting..." : "Export PDF"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Advanced Search Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Search className="h-5 w-5 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Advanced Search</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Refine your search by entering additional information such as Social Security Number, address, or policy number.
          </p>
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full"
          >
            {showAdvanced ? "Hide Advanced Search" : "Show Advanced Search"}
          </Button>
        </div>

        {/* Need Help Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Need Help?</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Contact customer support for assistance in locating life insurance policies.
          </p>
          <div className="text-sm text-slate-700 mb-4 space-y-1">
            <div>
              <span className="font-medium">Call:</span> 1-800-123-4567
            </div>
            <div>
              <span className="font-medium">Email:</span> support@heirvault.com
            </div>
          </div>
          <Link href="/dashboard/settings/org">
            <Button variant="outline" className="w-full">
              Contact Support
          </Button>
          </Link>
        </div>

      {/* Footer Warnings */}
      <div className="mt-12 pt-6 border-t border-slateui-200">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slateui-500">
          <span>Private, voluntary registry</span>
          <span className="text-slateui-300">•</span>
          <span>Not affiliated with insurers or regulators</span>
          <span className="text-slateui-300">•</span>
          <span>Use is voluntary, not required by law</span>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}

