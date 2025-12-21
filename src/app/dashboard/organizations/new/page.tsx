"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      // Redirect to the new organization
      router.push(`/dashboard/organizations/${data.organization.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/organizations"
          className="text-sm text-slate-400 hover:text-slate-300 mb-4 inline-block"
        >
          ← Back to Organizations
        </Link>
        <h1 className="text-2xl font-semibold text-slate-100">
          Create Organization
        </h1>
        <p className="text-sm text-slate-300">
          Create a new organization to manage team members and clients.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-200 mb-2">
              Organization Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Smith & Associates Law Firm"
              required
              minLength={1}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-700 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-400">
              A unique slug will be generated from this name.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create Organization"}
            </Button>
            <Link href="/dashboard/organizations">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

