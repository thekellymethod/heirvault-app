"use client";

import { useEffect, useState } from "react";

type Org = {
  id: string;
  name: string;
  role: string;
  stripeSubscriptionStatus: string;
  includedActiveRegistries: number;
};

export default function BillingPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/orgs");
        const j = await r.json();
        setOrgs(j.orgs || []);
        const first = j.orgs?.[0];
        if (first) {
          setOrgId(first.id);
          setStatus(first.stripeSubscriptionStatus);
        }
      } catch (e) {
        setErr("Failed to load organizations.");
      }
    })();
  }, []);

  useEffect(() => {
    const o = orgs.find((x) => x.id === orgId);
    if (o) setStatus(o.stripeSubscriptionStatus);
  }, [orgId, orgs]);

  async function startCheckout() {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || "Checkout failed.");
      window.location.href = j.url;
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, returnTo: "/app/billing" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || "Portal failed.");
      window.location.href = j.url;
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070c] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Billing
        </h1>

        <div className="mt-4 flex gap-3 items-center">
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <div className="text-sm text-white/70">
            Status: <span className="text-white/90 font-semibold">{status || "none"}</span>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-white/70">Registry Base</div>
          <div className="mt-2 text-4xl font-semibold">
            $39<span className="text-sm text-white/60">/mo</span>
          </div>
          <div className="mt-2 text-sm text-white/70">Includes up to 5 active registries.</div>
          <div className="mt-2 text-sm text-white/70">
            Additional active registries: <span className="font-semibold text-white">$8/registry/mo</span>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={startCheckout}
              disabled={busy}
              className="rounded-xl bg-[#C9A227] px-4 py-2 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-60"
            >
              {busy ? "Working…" : "Add billing"}
            </button>
            <button
              onClick={openPortal}
              disabled={busy}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10 disabled:opacity-60"
            >
              Manage billing
            </button>
          </div>

          {err && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {err}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
