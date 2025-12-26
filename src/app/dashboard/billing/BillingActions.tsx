"use client";

import { useState } from "react";

type Plan = "FREE" | "SOLO" | "SMALL_FIRM" | "ENTERPRISE";

export function BillingActions({ currentPlan: _currentPlan }: { currentPlan: Plan }) {
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function goToCheckout(plan: "SOLO" | "SMALL_FIRM") {
    setError(null);
    setLoadingPlan(plan);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to start checkout.");
      }

      const data = await res.json();
      window.location.href = data.url;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      setError(errorMessage || "Something went wrong.");
      setLoadingPlan(null);
    }
  }

  return (
    <section className="space-y-4">
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded px-2 py-1">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3 text-xs">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-[11px] uppercase text-slate-400">Solo</div>
          <div className="mt-1 text-lg font-semibold">$19 / mo</div>
          <p className="mt-2 text-slate-400">
            1 attorney seat. Up to 100 active client registries.
          </p>
          <button
            onClick={() => goToCheckout("SOLO")}
            disabled={loadingPlan !== null}
            className="mt-3 w-full rounded-full border border-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
          >
            {loadingPlan === "SOLO" ? "Redirecting..." : "Choose Solo"}
          </button>
        </div>

        <div className="rounded-xl border border-emerald-500 bg-slate-950/70 p-4 shadow-lg shadow-emerald-500/20">
          <div className="text-[11px] uppercase text-emerald-300">
            Small Firm
          </div>
          <div className="mt-1 text-lg font-semibold">$69 / mo</div>
          <p className="mt-2 text-slate-200">
            Up to 5 attorney seats. Up to 500 active client registries.
          </p>
          <button
            onClick={() => goToCheckout("SMALL_FIRM")}
            disabled={loadingPlan !== null}
            className="mt-3 w-full rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {loadingPlan === "SMALL_FIRM"
              ? "Redirecting..."
              : "Choose Small Firm"}
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-[11px] uppercase text-slate-400">
            Enterprise
          </div>
          <div className="mt-1 text-lg font-semibold">Let&apos;s talk</div>
          <p className="mt-2 text-slate-400">
            Larger firms, custom limits, SSO, and dedicated support.
          </p>
          <button
            disabled
            className="mt-3 w-full rounded-full border border-slate-700 px-3 py-1.5 text-[11px] text-slate-400"
          >
            Contact sales (coming soon)
          </button>
        </div>
      </div>
    </section>
  );
}

