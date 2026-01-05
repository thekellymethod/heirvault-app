"use client";

import { useEffect, useState } from "react";

type Org = {
  id: string;
  name: string;
  role: string;
  stripeSubscriptionStatus: string;
  includedActiveRegistries: number;
};

type Registry = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  archivedAt: string | null;
};

export default function RegistriesPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [registries, setRegistries] = useState<Registry[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/orgs");
        const j = await r.json();
        setOrgs(j.orgs || []);
        const first = j.orgs?.[0]?.id;
        if (first) setOrgId(first);
      } catch (e) {
        setErr("Failed to load organizations.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const r = await fetch(`/api/registries?orgId=${encodeURIComponent(orgId)}`);
        const j = await r.json();
        setRegistries(j.registries || []);
      } catch (e) {
        setErr("Failed to load registries.");
      }
    })();
  }, [orgId]);

  async function createRegistry() {
    setErr(null);
    if (!name.trim()) return setErr("Registry name required.");
    setBusy(true);
    try {
      const r = await fetch("/api/registries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, name: name.trim() }),
      });

      if (r.status === 402) {
        const j = await r.json().catch(() => ({}));
        setErr(j?.message || "Billing required.");
        window.location.href = "/app/billing";
        return;
      }

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || "Create failed.");
      }

      const j = await r.json();
      window.location.href = `/app/registries/${j.registryId}`;
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070c] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Policy Registries
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

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New registry name (e.g., Estate of John Doe)"
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) createRegistry();
            }}
          />

          <button
            onClick={createRegistry}
            disabled={busy}
            className="rounded-xl bg-[#C9A227] px-4 py-2 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        )}

        <div className="mt-8 grid gap-3">
          {registries.map((r) => (
            <a
              key={r.id}
              href={`/app/registries/${r.id}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
            >
              <div className="text-sm font-semibold">{r.name}</div>
              <div className="mt-1 text-xs text-white/60">
                Status: {r.status} • Created: {new Date(r.createdAt).toLocaleDateString()}
              </div>
            </a>
          ))}
          {registries.length === 0 && (
            <div className="text-sm text-white/60">No registries yet. Create one above.</div>
          )}
        </div>
      </div>
    </main>
  );
}
