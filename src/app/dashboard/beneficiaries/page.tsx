"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Users, UserCheck } from "lucide-react";

type Beneficiary = {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  policies: Array<{
    id: string;
    policyNumber: string | null;
    policyType: string | null;
    insurer: {
      name: string;
    };
  }>;
};

export default function BeneficiariesPage() {
  const router = useRouter();
  const [beneficiaries, setBeneficiaries] = React.useState<Beneficiary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    async function loadBeneficiaries() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/beneficiaries");
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Failed to load beneficiaries" }));
          throw new Error(errorData?.error || "Failed to load beneficiaries");
        }
        const data = await res.json();
        if (!cancelled) {
          setBeneficiaries(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadBeneficiaries();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBeneficiaries = React.useMemo(() => {
    if (!searchQuery.trim()) return beneficiaries;
    const query = searchQuery.toLowerCase();
    return beneficiaries.filter(
      (b) =>
        b.firstName.toLowerCase().includes(query) ||
        b.lastName.toLowerCase().includes(query) ||
        b.client.firstName.toLowerCase().includes(query) ||
        b.client.lastName.toLowerCase().includes(query) ||
        (b.email && b.email.toLowerCase().includes(query)) ||
        (b.phone && b.phone.toLowerCase().includes(query)) ||
        (b.relationship && b.relationship.toLowerCase().includes(query))
    );
  }, [beneficiaries, searchQuery]);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">Beneficiaries</h1>
            <p className="mt-2 text-base text-slateui-600">View and manage all beneficiaries across your clients.</p>
          </div>
        </div>

        {/* Search */}
        <div className="card p-4">
          <input
            type="text"
            placeholder="Search beneficiaries by name, email, phone, or client name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Beneficiaries list */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="p-8 text-center text-slateui-600">Loading beneficiaries...</div>
          ) : filteredBeneficiaries.length === 0 ? (
            <div className="p-8 text-center text-slateui-600">
              {searchQuery ? "No beneficiaries found matching your search." : "No beneficiaries yet."}
            </div>
          ) : (
            <div className="divide-y divide-slateui-200">
              {filteredBeneficiaries.map((beneficiary) => (
                <button
                  key={beneficiary.id}
                  onClick={() => router.push(`/dashboard/clients/${beneficiary.client.id}`)}
                  className="w-full p-5 text-left transition-all hover:bg-paper-100 focus:bg-paper-100 focus:outline-none"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-semibold text-ink-900">
                          {beneficiary.firstName} {beneficiary.lastName}
                        </h3>
                        {beneficiary.relationship && (
                          <span className="text-xs text-slateui-600 bg-paper-100 px-2 py-0.5 rounded">
                            {beneficiary.relationship}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slateui-600">
                        <span className="font-medium text-ink-900">Client:</span>
                        <span>
                          {beneficiary.client.firstName} {beneficiary.client.lastName}
                        </span>
                        <span className="text-slateui-300">•</span>
                        <span>{beneficiary.client.email}</span>
                        {beneficiary.email && (
                          <>
                            <span className="text-slateui-300">•</span>
                            <span>Email: {beneficiary.email}</span>
                          </>
                        )}
                        {beneficiary.phone && (
                          <>
                            <span className="text-slateui-300">•</span>
                            <span>Phone: {beneficiary.phone}</span>
                          </>
                        )}
                        {beneficiary.dateOfBirth && (
                          <>
                            <span className="text-slateui-300">•</span>
                            <span>DOB: {beneficiary.dateOfBirth.slice(0, 10)}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Policies list */}
                      {beneficiary.policies && beneficiary.policies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-gold-200">
                          <div className="text-xs font-medium text-slateui-500 mb-2">
                            Policies ({beneficiary.policies.length}):
                          </div>
                          <div className="space-y-1">
                            {beneficiary.policies.map((policy) => (
                              <div key={policy.id} className="text-xs text-slateui-600">
                                <span className="font-medium">{policy.insurer.name}</span>
                                {policy.policyNumber && <span> • {policy.policyNumber}</span>}
                                {policy.policyType && <span> • {policy.policyType}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-slateui-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}

