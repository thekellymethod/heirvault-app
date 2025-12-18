"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type BeneficiaryRow = {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  createdAt: string;
};

export default function ClientBeneficiariesPage() {
  const [items, setItems] = React.useState<BeneficiaryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [relationship, setRelationship] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/client/beneficiaries");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load beneficiaries");
      setItems(data.beneficiaries || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  async function createBeneficiary() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/client/beneficiaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          relationship: relationship.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          dateOfBirth: dateOfBirth || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create beneficiary");

      setOpen(false);
      setFirstName("");
      setLastName("");
      setRelationship("");
      setEmail("");
      setPhone("");
      setDateOfBirth("");
      await load();
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
          <h1 className="text-2xl font-semibold text-slate-900">Your Beneficiaries</h1>
          <p className="mt-1 text-slate-600">View and add beneficiaries.</p>
        </div>
        <Button onClick={() => setOpen((s) => !s)}>
          {open ? "Close" : "Add beneficiary"}
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
            <Field label="First name" value={firstName} onChange={setFirstName} required />
            <Field label="Last name" value={lastName} onChange={setLastName} required />
            <Field label="Relationship" value={relationship} onChange={setRelationship} />
            <Field label="Email" value={email} onChange={setEmail} />
            <Field label="Phone" value={phone} onChange={setPhone} />
            <Field label="DOB" value={dateOfBirth} onChange={setDateOfBirth} type="date" />
          </div>
          <div className="mt-6 flex justify-end">
            <Button disabled={!firstName.trim() || !lastName.trim() || saving} onClick={createBeneficiary}>
              {saving ? "Saving..." : "Create beneficiary"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4 text-sm font-semibold text-slate-900">
          {loading ? "Loading..." : `${items.length} beneficiary(ies)`}
        </div>
        <div className="divide-y divide-slate-200">
          {!loading && items.length === 0 && (
            <div className="px-6 py-8 text-slate-600">No beneficiaries yet.</div>
          )}
          {items.map((b) => (
            <div key={b.id} className="px-6 py-4">
              <div className="text-sm font-semibold text-slate-900">
                {b.firstName} {b.lastName} {b.relationship ? `• ${b.relationship}` : ""}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {b.email ? `Email: ${b.email}` : "Email: —"} • {b.phone ? `Phone: ${b.phone}` : "Phone: —"} •{" "}
                {b.dateOfBirth ? `DOB: ${b.dateOfBirth.slice(0, 10)}` : "DOB: —"}
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-800">{label}</div>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        type={type}
      />
    </label>
  );
}
