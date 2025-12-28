// src/app/dashboard/billing/InvoicesPanel.tsx
"use client";

import { useEffect, useState } from "react";

async function getJson(url: string) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Request failed");
  return json;
}

export default function InvoicesPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const r = await getJson("/api/billing/invoices");
      setItems(r.invoices ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load invoices");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const open = async (artifactId: string) => {
    try {
      const r = await getJson(`/api/billing/invoices/${artifactId}/open`);
      if (r?.url) window.open(r.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e?.message ?? "Failed to open invoice");
    }
  };

  return (
    <div className="rounded-2xl border p-5 space-y-3">
      <div className="font-semibold">Billing Invoices</div>
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="space-y-2">
        {items.map((i) => (
          <div key={i.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
            <div className="text-sm">
              <div className="font-medium">{i.invoiceNumber ?? i.invoiceId ?? "Invoice"}</div>
              <div className="text-xs text-slate-600">
                {new Date(i.createdAt).toLocaleString()}
                {i.amountPaid != null ? ` • ${(i.amountPaid / 100).toFixed(2)} ${String(i.currency ?? "usd").toUpperCase()}` : ""}
              </div>
            </div>
            <button className="px-3 py-1 rounded-lg border hover:bg-slate-50" onClick={() => open(i.id)}>
              Open PDF
            </button>
          </div>
        ))}
        {!items.length && <div className="text-sm text-slate-500">No invoices yet.</div>}
      </div>
    </div>
  );
}

