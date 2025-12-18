"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Insurer = {
  id: string;
  name: string;
  contactPhone: string | null;
  contactEmail: string | null;
  website: string | null;
};

export default function EditInsurerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/insurers/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load insurer");
      const insurer: Insurer = data.insurer;

      setName(insurer.name || "");
      setContactPhone(insurer.contactPhone || "");
      setContactEmail(insurer.contactEmail || "");
      setWebsite(insurer.website || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/insurers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contactPhone: contactPhone.trim() || null,
          contactEmail: contactEmail.trim() || null,
          website: website.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update insurer");
      router.push("/dashboard/insurers");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/insurers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete insurer");
      router.push("/dashboard/insurers");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Edit insurer</h1>
          <p className="mt-1 text-slate-600">Update directory fields used for policy creation.</p>
        </div>
        <Link
          href="/dashboard/insurers"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Back
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        {loading ? (
          <div className="text-slate-600">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" value={name} onChange={setName} required />
              <Field label="Website" value={website} onChange={setWebsite} placeholder="https://..." />
              <Field label="Contact Email" value={contactEmail} onChange={setContactEmail} placeholder="claims@..." />
              <Field label="Contact Phone" value={contactPhone} onChange={setContactPhone} placeholder="(555)..." />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                disabled={deleting}
                onClick={remove}
                className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
              >
                {deleting ? "Deleting..." : "Delete insurer"}
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => router.push("/dashboard/insurers")} disabled={saving}>
                  Cancel
                </Button>
                <Button disabled={!name.trim() || saving} onClick={save}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              If delete fails, it’s because policies already reference this insurer (expected safety behavior).
            </div>
          </>
        )}
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
