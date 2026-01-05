"use client";

import { useEffect, useState } from "react";
import { FileUploader } from "@/components/FileUploader";
import { FileList } from "@/components/FileList";

type Policy = {
  id: string;
  carrier: string | null;
  policyNumber: string | null;
  insuredName: string | null;
  beneficiary: string | null;
  status: string;
  faceAmount: string | null;
  createdAt: string;
};

export default function RegistryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [registryId, setRegistryId] = useState<string>("");
  const [registry, setRegistry] = useState<any>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [orgId, setOrgId] = useState<string>("");

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // policy form
  const [carrier, setCarrier] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [insuredName, setInsuredName] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [status, setStatus] = useState("unknown");

  useEffect(() => {
    (async () => {
      const p = await params;
      setRegistryId(p.id);
    })();
  }, [params]);

  useEffect(() => {
    if (!registryId) return;
    (async () => {
      try {
        const r = await fetch(`/api/registries/${registryId}`);
        if (!r.ok) {
          setErr("Failed to load registry.");
          return;
        }
        const j = await r.json();
        setRegistry(j.registry);
        setOrgId(j.registry.orgId);
        setPolicies(j.registry.policies || []);
      } catch (e) {
        setErr("Failed to load registry.");
      }
    })();
  }, [registryId]);

  async function addPolicy() {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registryId,
          carrier,
          policyNumber,
          insuredName,
          beneficiary,
          status,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || "Failed to create policy.");
      }
      const list = await fetch(`/api/policies?registryId=${encodeURIComponent(registryId)}`);
      const j2 = await list.json();
      setPolicies(j2.policies || []);
      setCarrier("");
      setPolicyNumber("");
      setInsuredName("");
      setBeneficiary("");
      setStatus("unknown");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!registry) {
    return (
      <main className="min-h-screen bg-[#05070c] text-white p-6">
        <div className="max-w-5xl mx-auto text-white/70">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070c] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {registry.name}
            </h1>
            <div className="mt-1 text-sm text-white/60">Registry ID: {registry.id}</div>
          </div>
          <a
            href={`/app/registries/${registryId}/export`}
            className="rounded-xl bg-[#C9A227] px-4 py-2 text-sm font-semibold text-black hover:brightness-95 transition"
          >
            Export PDF
          </a>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        )}

        {/* Add policy */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/90">Add policy</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/40"
              placeholder="Carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/40"
              placeholder="Policy #"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
            />
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/40"
              placeholder="Insured name"
              value={insuredName}
              onChange={(e) => setInsuredName(e.target.value)}
            />
            <input
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/40"
              placeholder="Beneficiary"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
            />
            <select
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="unknown">Unknown</option>
              <option value="requested">Requested</option>
              <option value="verified">Verified</option>
              <option value="paid">Paid</option>
              <option value="denied">Denied</option>
            </select>
            <button
              onClick={addPolicy}
              disabled={busy}
              className="rounded-xl bg-[#C9A227] px-4 py-2 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Add policy"}
            </button>
          </div>
        </div>

        {/* Policies table */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/90">Policies</div>
          <div className="mt-4 overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/30 text-white/70">
                <tr>
                  <th className="p-3 text-left">Carrier</th>
                  <th className="p-3 text-left">Policy #</th>
                  <th className="p-3 text-left">Insured</th>
                  <th className="p-3 text-left">Beneficiary</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id} className="border-t border-white/10">
                    <td className="p-3">{p.carrier || "—"}</td>
                    <td className="p-3">{p.policyNumber || "—"}</td>
                    <td className="p-3">{p.insuredName || "—"}</td>
                    <td className="p-3">{p.beneficiary || "—"}</td>
                    <td className="p-3">{p.status}</td>
                  </tr>
                ))}
                {policies.length === 0 && (
                  <tr>
                    <td className="p-3 text-white/60" colSpan={5}>
                      No policies yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Files */}
        {orgId && registryId && (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <FileUploader orgId={orgId} registryId={registryId} category="policies" />
            <FileList orgId={orgId} registryId={registryId} />
          </div>
        )}
      </div>
    </main>
  );
}
