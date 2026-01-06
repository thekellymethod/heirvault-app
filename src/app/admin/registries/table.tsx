"use client";

import { useState } from "react";

type ClientFileAsset = {
  id: string;
  createdAt: Date;
  registryId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number | null;
  storageBucket: string;
  storagePath: string;
  status: string;
};

type RegistryWithFiles = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  clientEmail: string;
  clientName: string | null;
  status: string;
  completedAt: Date | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  summaryBucket: string | null;
  summaryPath: string | null;
  files: ClientFileAsset[];
};

export default function AdminRegistriesTable({ registries }: { registries: RegistryWithFiles[] }) {
  const [busyId, setBusyId] = useState<string>("");

  async function markComplete(registryId: string) {
    setBusyId(registryId);
    try {
      const res = await fetch("/api/admin/registry/complete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": process.env.NEXT_PUBLIC_ADMIN_TOKEN || "",
        },
        body: JSON.stringify({ registryId }),
      });

      if (!res.ok) throw new Error(await res.text());
      alert("Marked COMPLETE and generated PDF.");
      window.location.reload();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId("");
    }
  }

  async function getSummary(registryId: string) {
    try {
      const res = await fetch(`/api/admin/registry/summary-url?registryId=${encodeURIComponent(registryId)}`, {
        headers: { "x-admin-token": process.env.NEXT_PUBLIC_ADMIN_TOKEN || "" },
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No summary available");
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {registries.map((r) => (
        <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800 }}>
                {r.clientName ? r.clientName : "(No name)"} — {r.clientEmail}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Registry ID: {r.id} • Status: <b>{r.status}</b> • Files: {r.files?.length ?? 0}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => markComplete(r.id)}
                disabled={busyId === r.id || r.status === "COMPLETE"}
                style={{ padding: "8px 10px", fontWeight: 700 }}
              >
                {r.status === "COMPLETE" ? "Complete" : busyId === r.id ? "Working…" : "Mark COMPLETE + PDF"}
              </button>

              <button
                onClick={() => getSummary(r.id)}
                disabled={!r.summaryPath}
                style={{ padding: "8px 10px" }}
              >
                Open Summary PDF
              </button>
            </div>
          </div>

          {r.files?.length ? (
            <ul style={{ marginTop: 10, paddingLeft: 18 }}>
              {r.files.map((f: ClientFileAsset) => (
                <li key={f.id} style={{ marginBottom: 6 }}>
                  <b>{f.originalName}</b>{" "}
                  <span style={{ opacity: 0.75 }}>
                    — {f.status} — {new Date(f.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ marginTop: 10, opacity: 0.75 }}>No uploads yet.</div>
          )}
        </div>
      ))}
    </div>
  );
}
