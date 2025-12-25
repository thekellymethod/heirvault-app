"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Beneficiary = {
  id: string,
  firstName: string,
  lastName: string,
  relationship: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
};

type Policy = {
  id: string,
  policyNumber: string | null;
  policyType: string | null;
  carrierNameRaw?: string | null;
  insurer?: { id: string, name: string, website?: string | null } | null;
  beneficiaries: Beneficiary[];
  createdAt?: string,
};

export default function ClientPoliciesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const clientId = params.id;

  const [policies, setPolicies] = React.useState<Policy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Check for insurerId and insurerName from query params (from insurers page)
  const insurerIdFromQuery = searchParams.get("insurerId");
  const insurerNameFromQuery = searchParams.get("insurerName");
  const shouldOpenCreate = !!insurerIdFromQuery;

  const [createOpen, setCreateOpen] = React.useState(shouldOpenCreate);
  const [insurerId, setInsurerId] = React.useState(insurerIdFromQuery || "");
  const [policyNumber, setPolicyNumber] = React.useState("");
  const [policyType, setPolicyType] = React.useState("");
  
  const [insurers, setInsurers] = React.useState<{ id: string, name: string }[]>([]);
  const [loadingInsurers, setLoadingInsurers] = React.useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/policies`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load policies");
      setPolicies(data.policies || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [clientId]);

  async function loadInsurers() {
    setLoadingInsurers(true);
    try {
      const res = await fetch("/api/insurers");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load insurers");
      setInsurers(data.insurers || []);
    } catch (e) {
      console.error("Failed to load insurers:", e);
    } finally {
      setLoadingInsurers(false);
    }
  }

  React.useEffect(() => {
    if (createOpen) {
      loadInsurers();
    }
  }, [createOpen]);

  // If we have an insurerId from query params, make sure it's selected when insurers load
  React.useEffect(() => {
    if (insurerIdFromQuery && insurers.length > 0 && !insurerId) {
      setInsurerId(insurerIdFromQuery);
      // Clean up URL by removing query params
      const url = new URL(window.location.href);
      url.searchParams.delete("insurerId");
      url.searchParams.delete("insurerName");
      window.history.replaceState({}, "", url.toString());
    }
  }, [insurerIdFromQuery, insurers, insurerId]);

  async function createPolicy() {
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/policies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insurerId: insurerId.trim(),
          policyNumber: policyNumber.trim() || null,
          policyType: policyType.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create policy");
      setCreateOpen(false);
      setInsurerId("");
      setPolicyNumber("");
      setPolicyType("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Policies</h1>
          <p className="mt-1 text-slate-600">Create and manage policies for this client.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/clients/${clientId}`)}>
            Back to client
          </Button>
          <Button onClick={() => setCreateOpen((s) => !s)}>
            {createOpen ? "Close" : "New policy"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {createOpen && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="block">
              <label htmlFor="insurer-select" className="text-sm font-medium text-slate-800 block mb-1">
                Insurer <span className="text-red-500">*</span>
              </label>
              <select
                id="insurer-select"
                name="insurer-select"
                aria-label="Select insurer"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                value={insurerId}
                onChange={(e) => setInsurerId(e.target.value)}
                required
                disabled={loadingInsurers}
              >
                <option value="">
                  {loadingInsurers ? "Loading insurers..." : "Select an insurer"}
                </option>
                {insurers.map((insurer) => (
                  <option key={insurer.id} value={insurer.id}>
                    {insurer.name}
                  </option>
                ))}
              </select>
              {insurers.length === 0 && !loadingInsurers && (
                <p className="mt-1 text-xs text-slate-500">
                  No insurers found.{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/insurers")}
                    className="text-emerald-600 hover:underline"
                  >
                    Add an insurer
                  </button>
                </p>
              )}
            </div>
            <Field label="Policy Number" value={policyNumber} onChange={setPolicyNumber} />
            <Field label="Policy Type" value={policyType} onChange={setPolicyType} />
          </div>
          <div className="mt-6 flex justify-end">
            <Button disabled={!insurerId.trim()} onClick={createPolicy}>
              Create policy
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-900">
          {loading ? "Loading..." : `${policies.length} policy(ies)`}
        </div>
        <div className="divide-y divide-slate-200">
          {!loading && policies.length === 0 && (
            <div className="px-6 py-8 text-slate-600">No policies yet.</div>
          )}
          {policies.map((p) => (
            <div key={p.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {p.policyType || "Policy"} {p.policyNumber ? `• ${p.policyNumber}` : ""}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                    <span>
                      Insurer: {p.insurer?.name ?? p.carrierNameRaw ?? "Unknown"}
                    </span>
                    {!p.insurer?.name && p.carrierNameRaw && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                        Unresolved
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Open beneficiary management modal or navigate
                    const modal = document.getElementById(`beneficiary-modal-${p.id}`);
                    if (modal) {
                      (modal as HTMLDialogElement).showModal();
                    }
                  }}
                >
                  {p.beneficiaries.length > 0 ? `Manage (${p.beneficiaries.length})` : "Add beneficiaries"}
                </Button>
              </div>
              
              {/* Beneficiaries list */}
              {p.beneficiaries.length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-slate-200">
                  <div className="text-xs font-medium text-slate-500 mb-2">
                    Beneficiaries ({p.beneficiaries.length}):
                  </div>
                  <div className="space-y-2">
                    {p.beneficiaries.map((b) => (
                      <div key={b.id} className="text-sm text-slate-700 bg-slate-50 rounded px-3 py-2">
                        <div className="font-medium">
                          {b.firstName} {b.lastName}
                          {b.relationship && (
                            <span className="text-xs text-slate-500 ml-2">({b.relationship})</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex gap-3">
                          {b.email && <span>Email: {b.email}</span>}
                          {b.phone && <span>Phone: {b.phone}</span>}
                          {b.dateOfBirth && (
                            <span>DOB: {new Date(b.dateOfBirth).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string,
  value: string,
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-800">{label}</div>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  );
}
