// src/app/dashboard/billing/BillingActions.tsx
"use client";

import { useState } from "react";

export function BillingActions({ 
  subscriptionStatus, 
  currentPeriodEnd 
}: { 
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = subscriptionStatus === "ACTIVE" || subscriptionStatus === "TRIALING";

  async function handleCheckout() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Failed to start checkout");
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      setError(errorMessage);
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {isActive ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-green-900">Active Subscription</div>
              {currentPeriodEnd && (
                <div className="mt-1 text-xs text-green-700">
                  Renews: {new Date(currentPeriodEnd).toLocaleDateString()}
                </div>
              )}
            </div>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-green-300 bg-white text-sm font-medium text-green-900 hover:bg-green-50 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Manage Subscription"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="text-center space-y-4">
            <div>
              <div className="text-lg font-semibold text-slate-900">HeirVault Firm</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">$199<span className="text-sm font-normal text-slate-600">/month</span></div>
              <p className="mt-2 text-sm text-slate-600">
                One subscription per firm. Unlimited attorneys and clients.
              </p>
            </div>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full px-6 py-3 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Redirecting..." : "Subscribe"}
            </button>
            <p className="text-xs text-slate-500">
              Secure checkout powered by Stripe. Cancel anytime.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
