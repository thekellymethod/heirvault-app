"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type PolicyRow = {
  id: string;
  policyNumber: string | null;
  policyType: string | null;
  createdAt: string;
  insurer: { id: string; name: string } | null;
  beneficiaryCount: number;
};

type InsurerOption = { id: string; name: string };

export default function ClientPoliciesPage() {
  const [items, setItems] = React.useState<PolicyRow[]>([]);
  const [insurers, setInsurers] = React.useState<InsurerOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [insurerId, setInsurerId] = React.useState("");
  const [policyNumber, setPolicyNumber] = React.useState("");
  const [policyType, setPolicyType] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [polRes, insRes] = await Promise.all([
        fetch("/api/client/policies"),
        fetch("/api/client/insurers"),
      ]);

      const polData = await polRes.json();
      const insData = await insRes.json();

      if (!polRes.ok) throw new Error(polData?.error || "Failed to load policies");
      if (!insRes.ok) throw new Error(insData?.error || "Failed to load insurers");

      setItems(polData.policies || []);
      setInsurers(insData.insurers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { loadAll(); }, []);

  async function createPolicy() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/client/policies", {
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

      setOpen(false);
      setInsurerId("");
      setPolicyNumber("");
      setPolicyType("");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Your Policies</h1>
          <p className="mt-1 text-slate-600">View and add policies linked to your registry.</p>
        </div>
        <Button onClick={() => setOpen((s) => !s)}>
          {open ? "Close" : "Add policy"}
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {open && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <div className="text-sm font-medium text-slate-800">Insurer</div>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
                value={insurerId}
                onChange={(e) => setInsurerId(e.target.value)}
              >
                <option value="">Select an insurer…</option>
                {insurers.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>

            <Field label="Policy Number" value={policyNumber} onChange={setPolicyNumber} />
            <Field label="Policy Type" value={policyType} onChange={setPolicyType} />
          </div>

          <div className="mt-6 flex justify-end">
            <Button disabled={!insurerId.trim() || saving} onClick={createPolicy}>
              {saving ? "Saving..." : "Create policy"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-900">
          {loading ? "Loading..." : `${items.length} policy(ies)`}
        </div>
        <div className="divide-y divide-slate-200">
          {!loading && items.length === 0 && (
            <div className="px-6 py-8 text-slate-600">No policies yet.</div>
          )}
          {items.map((p) => (
            <div key={p.id} className="px-6 py-4">
              <div className="text-sm font-semibold text-slate-900">
                {p.policyType || "Policy"} {p.policyNumber ? `• ${p.policyNumber}` : ""}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {p.insurer?.name ? `Insurer: ${p.insurer.name}` : "Insurer: —"} • Beneficiaries: {p.beneficiaryCount}
              </div>
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
  label: string;
  value: string;
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
