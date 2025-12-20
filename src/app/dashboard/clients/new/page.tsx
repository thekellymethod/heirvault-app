"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string; // yyyy-mm-dd
};

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone.trim() || null,
          dateOfBirth: form.dateOfBirth || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create client");
      }

      const clientId = data?.client?.id as string | undefined;
      if (!clientId) throw new Error("Client created but no id returned");

      router.push(`/dashboard/clients/${clientId}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">New Client</h1>
        <p className="text-sm text-slate-300">
          Create a client profile for the life insurance registry.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-4"
      >
        {error ? (
          <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <div className="text-xs font-semibold text-slate-400">First name</div>
            <input
              className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              required
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs font-semibold text-slate-400">Last name</div>
            <input
              className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              required
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <div className="text-xs font-semibold text-slate-400">Email</div>
          <input
            type="email"
            className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <div className="text-xs font-semibold text-slate-400">Phone</div>
            <input
              className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Optional"
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs font-semibold text-slate-400">Date of birth</div>
            <input
              type="date"
              className="h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
              value={form.dateOfBirth}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/clients")}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Creating..." : "Create Client"}
          </Button>
        </div>
      </form>
    </div>
  );
}
