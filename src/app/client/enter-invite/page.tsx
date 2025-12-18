"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function ClientEnterInvitePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [inviteCode, setInviteCode] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isLoaded && !user) {
      router.push("/client/login");
    }
  }, [user, isLoaded, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!inviteCode.trim()) {
      setError("Invitation code is required");
      return;
    }

    setSubmitting(true);
    try {
      // Redirect to invite page with the token
      router.push(`/invite/${inviteCode.trim()}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Enter Invitation Code</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Enter the invitation code provided by your attorney to access your registry
          </p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Invitation Code <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter your invitation code"
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 font-mono"
              required
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              This code was sent to you by your attorney via email
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !inviteCode.trim()}
            className="w-full rounded-md bg-emerald-600 dark:bg-emerald-500 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 hover:bg-emerald-700 dark:hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Processing..." : "Continue"}
          </button>
        </form>
        
        <div className="text-center">
          <button
            onClick={() => router.push("/client-portal")}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline"
          >
            Skip - Go to Client Portal
          </button>
        </div>
      </div>
    </div>
  );
}

