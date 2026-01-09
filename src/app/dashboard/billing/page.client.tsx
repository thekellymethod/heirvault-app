// src/app/dashboard/billing/page.client.tsx
"use client";

import { useEffect, useState, createElement } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Script from "next/script";
import { PageLoadingSkeleton } from "@/components/ui/loading";
import InvoicesPanel from "./InvoicesPanel";

async function getJson(url: string) {
  const r = await fetch(url);
  return r.json();
}

async function postJson(url: string) {
  const r = await fetch(url, { method: "POST" });
  return r.json();
}

type Org = {
  subscriptionStatus?: string;
  currentPeriodEnd?: string | null;
};

function BillingClientInner() {
  const searchParams = useSearchParams();
  const blocked = searchParams?.get("blocked") === "1";
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getJson("/api/org/me").then((data) => setOrg(data as Org)).catch(() => setOrg(null));
  }, []);

  const upgrade = async () => {
    setLoading(true);
    try {
      const r = await postJson("/api/billing/checkout") as { url?: string };
      if (r?.url) window.location.href = r.url;
    } catch (e) {
      console.error("Checkout failed:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!org) return <PageLoadingSkeleton />;

  const active = org.subscriptionStatus === "ACTIVE" || org.subscriptionStatus === "TRIALING";

  return (
    <div className="max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Firm Registry Subscription</h1>

      {blocked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            This action requires an active registry subscription.
          </p>
        </div>
      )}

      <div className="rounded-2xl border p-5 space-y-2">
        <div className="text-sm text-slate-800">Status</div>
        <div className="text-lg font-medium text-slate-900">
          {active ? "Registry Active" : "Registry Inactive"}
        </div>
        {org.currentPeriodEnd && (
          <div className="text-xs text-slate-700">
            Current period ends {new Date(org.currentPeriodEnd).toLocaleDateString()}
          </div>
        )}
      </div>

      {!active && (
        <div className="rounded-2xl border p-5 space-y-3">
          <div className="font-medium text-slate-900">$199 / firm / month</div>
          <p className="text-sm text-slate-900">
            HeirVault is a secure records registry. An active subscription enables
            your firm to issue verified upload credentials, retain immutable intake
            artifacts, and rely on audit-ready records for compliance and dispute
            resolution.
          </p>
          <div className="flex flex-col gap-3">
            <div id="stripe-buy-button-container">
              {createElement("stripe-buy-button" as any, {
                "buy-button-id": "buy_btn_1SizHqICdoRswaDqc9D4reJy",
                "publishable-key": "pk_live_51SJHsUICdoRswaDqab95zqlZGVQuCyG4DFHgIXBW8CnWM7zWGxM4cn1qj7ZMPGtcEqxhmNFJ4NaS4bGQdnjZWI9200Fijnyn5b",
              })}
            </div>
            <div className="text-xs text-slate-700 border-t pt-3">
              <p className="font-medium mb-1 text-slate-900">Test Payment:</p>
              <p className="text-slate-800">Use test card: <code className="bg-slate-100 px-1 rounded text-slate-900">4242 4242 4242 4242</code></p>
              <p className="text-slate-800">Any future expiry date, any CVC, any ZIP</p>
            </div>
          </div>
        </div>
      )}

      {active && (
        <div className="rounded-2xl border p-5 space-y-3">
          <p className="text-sm text-slate-900">
            Your firm&apos;s registry is active. You may manage billing or cancel at any
            time. Existing records remain accessible in read-only mode if canceled.
          </p>
          <button
            disabled={loading}
            className="px-4 py-2 rounded-xl border hover:bg-slate-50 disabled:opacity-60 text-slate-900"
            onClick={upgrade}
          >
            {loading ? "Redirecting..." : "Manage Billing"}
          </button>
        </div>
      )}

      <InvoicesPanel />
      
      <Script
        src="https://js.stripe.com/v3/buy-button.js"
        strategy="lazyOnload"
        onLoad={() => {
          // Stripe Buy Button script loaded
        }}
      />
    </div>
  );
}

export default function BillingClient() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <BillingClientInner />
    </Suspense>
  );
}

