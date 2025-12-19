"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function AttorneyOnboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [organizationName, setOrganizationName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isLoaded && !user) {
      router.push("/attorney/sign-in");
    }
  }, [user, isLoaded, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!organizationName.trim()) {
      setError("Organization name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: organizationName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create organization");
      }

      // Success - redirect to dashboard
      // Use window.location for a hard redirect to ensure fresh data
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Complete Your Setup</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your law firm or organization name to get started
          </p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium text-slate-700 mb-1">
              Organization/Firm Name <span className="text-red-500">*</span>
            </label>
            <input
              id="orgName"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g., Smith & Associates Law Firm"
              className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-slate-500">
              This will be used in client communications and documents
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !organizationName.trim()}
            className="btn-primary w-full"
          >
            {submitting ? "Creating..." : "Continue to Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}

