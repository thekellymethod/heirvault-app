"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type InsurerRow = {
  id: string;
  name: string;
  contactPhone: string | null;
  contactEmail: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
};

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export default function DashboardInsurersPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<InsurerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  
  // State for post-creation flow
  const [newlyCreatedInsurer, setNewlyCreatedInsurer] = React.useState<{ id: string; name: string } | null>(null);
  const [showClientSelector, setShowClientSelector] = React.useState(false);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = React.useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insurers");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load insurers");
      setItems(data.insurers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function loadClients() {
    setLoadingClients(true);
    try {
      const res = await fetch("/api/client");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load clients");
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load clients:", e);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  }

  async function createInsurer() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/insurers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contactPhone: contactPhone.trim() || null,
          contactEmail: contactEmail.trim() || null,
          website: website.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create insurer");

      // Store the newly created insurer for the post-creation flow
      setNewlyCreatedInsurer({ id: data.insurerId, name: name.trim() });
      
      setOpen(false);
      setName("");
      setContactPhone("");
      setContactEmail("");
      setWebsite("");
      await load();
      
      // Load clients for the selector
      await loadClients();
      setShowClientSelector(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function handleCreatePolicy(clientId: string) {
    if (!newlyCreatedInsurer) return;
    // Navigate to policy creation page with the insurer pre-selected
    router.push(`/dashboard/clients/${clientId}/policies?insurerId=${newlyCreatedInsurer.id}&insurerName=${encodeURIComponent(newlyCreatedInsurer.name)}`);
    setShowClientSelector(false);
    setNewlyCreatedInsurer(null);
  }

  function handleSkipPolicyCreation() {
    setShowClientSelector(false);
    setNewlyCreatedInsurer(null);
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Insurers</h1>
          <p className="mt-1 text-slate-600">Manage the insurer directory used in policy creation.</p>
        </div>
        <Button onClick={() => setOpen((s) => !s)}>{open ? "Close" : "Add insurer"}</Button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success message and client selector after creating insurer */}
      {newlyCreatedInsurer && showClientSelector && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-emerald-900">
                Insurer "{newlyCreatedInsurer.name}" created successfully!
              </h3>
              <p className="mt-1 text-sm text-emerald-700">
                Would you like to create a policy with this insurer?
              </p>
            </div>
            <button
              onClick={handleSkipPolicyCreation}
              className="text-emerald-700 hover:text-emerald-900"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {loadingClients ? (
            <div className="mt-4 text-sm text-emerald-700">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="mt-4 text-sm text-emerald-700">
              No clients found.{" "}
              <Link href="/dashboard/clients/new" className="font-medium underline hover:text-emerald-900">
                Create a client first
              </Link>
            </div>
          ) : (
            <div className="mt-4">
              <label className="block text-sm font-medium text-emerald-900 mb-2">
                Select a client to create a policy:
              </label>
              <div className="space-y-2">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleCreatePolicy(client.id)}
                    className="w-full rounded-md border border-emerald-300 bg-white px-4 py-2 text-left text-sm text-emerald-900 hover:bg-emerald-100 transition-colors"
                  >
                    {client.firstName} {client.lastName} ({client.email})
                  </button>
                ))}
              </div>
              <button
                onClick={handleSkipPolicyCreation}
                className="mt-3 text-sm text-emerald-700 hover:text-emerald-900 underline"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" value={name} onChange={setName} required />
            <Field label="Website" value={website} onChange={setWebsite} placeholder="https://..." />
            <Field label="Contact Email" value={contactEmail} onChange={setContactEmail} placeholder="claims@..." />
            <Field label="Contact Phone" value={contactPhone} onChange={setContactPhone} placeholder="(555)..." />
          </div>
          <div className="mt-6 flex justify-end">
            <Button disabled={!name.trim() || saving} onClick={createInsurer}>
              {saving ? "Saving..." : "Create insurer"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="text-sm font-semibold text-slate-900">
            {loading ? "Loading..." : `${items.length} insurer(s)`}
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="divide-y divide-slate-200">
          {!loading && items.length === 0 && (
            <div className="px-6 py-10 text-slate-600">No insurers yet.</div>
          )}

          {items.map((i) => (
            <div key={i.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{i.name}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {i.website ? `Website: ${i.website}` : "Website: —"} •{" "}
                    {i.contactEmail ? `Email: ${i.contactEmail}` : "Email: —"} •{" "}
                    {i.contactPhone ? `Phone: ${i.contactPhone}` : "Phone: —"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/insurers/${i.id}/edit`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                </div>
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-800">{label}</div>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}
