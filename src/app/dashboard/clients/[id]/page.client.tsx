// src/app/dashboard/clients/[id]/page.client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import AccessControlPanel from "./components/AccessControlPanel";
import ReceiptsPanel from "./components/ReceiptsPanel";

type Overview = any;

async function apiGet(url: string) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`GET ${url} failed`);
  return res.json();
}

async function apiPost(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `POST ${url} failed`);
  return json;
}

function DocTypeLabel(dt: string) {
  const map: Record<string, string> = {
    DRIVERS_LICENSE: "Driver's License",
    PASSPORT: "Passport",
    POLICY: "Insurance Policy",
    BENEFICIARY_DOC: "Beneficiary Document",
    TAX_W9: "Tax Form",
    TAX_1040: "Tax Return",
    TAX_OTHER: "Tax Document",
    COURT_FILING: "Court Filing",
    DEMAND_LETTER: "Demand Letter",
    CLAIM_SUMMARY: "Claim Summary",
    OTHER: "Document",
  };
  return map[dt] ?? "Document";
}

export default function ClientPageClient({ params }: { params: Promise<{ id: string }> }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    params.then((p) => setClientId(p.id));
  }, [params]);

  const reload = async () => {
    if (!clientId) return;
    setErr(null);
    try {
      const o = await apiGet(`/api/attorney/clients/${clientId}/overview`);
      setData(o);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load");
    }
  };

  useEffect(() => {
    if (clientId) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const docs = data?.documents ?? [];
  const proposed = data?.proposedBeneficiaries ?? [];
  const receipts = data?.receipts ?? [];

  const openReceipt = async (artifactId: string) => {
    try {
      const r = await apiGet(`/api/artifacts/${artifactId}/open`);
      if (r?.url) window.open(r.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e?.message ?? "Failed to open receipt");
    }
  };

  const onPreview = async (documentId: string) => {
    try {
      const r = await apiGet(`/api/documents/${documentId}/preview`);
      if (r?.url) window.open(r.url, "_blank", "noopener,noreferrer");
      else if (r?.requiresReasonedAccess) {
        // Preview blocked, need to request original with reason
        onOriginalWithReason(documentId);
      }
    } catch (e: any) {
      alert(e?.message ?? "Preview failed");
    }
  };

  const onOriginalWithReason = async (documentId: string) => {
    const reason = window.prompt("Reason required to view original (logged):");
    if (!reason || reason.trim().length < 5) return;
    try {
      const r = await apiPost(`/api/documents/${documentId}/original`, { reason });
      if (r?.url) window.open(r.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e?.message ?? "Access failed");
    }
  };

  const onDownloadWithReason = async (documentId: string) => {
    const reason = window.prompt("Reason required to download (logged):");
    if (!reason || reason.trim().length < 5) return;
    try {
      const r = await apiPost(`/api/documents/${documentId}/download`, { reason });
      if (r?.url) window.open(r.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e?.message ?? "Download failed");
    }
  };

  const confirmProposed = async (id: string) => {
    setBusy(true);
    try {
      await apiPost(`/api/attorney/beneficiaries/proposed/${id}/confirm`, {});
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "Confirm failed");
    } finally {
      setBusy(false);
    }
  };

  const rejectProposed = async (id: string) => {
    const reason = window.prompt("Reason (optional, logged):") ?? "";
    setBusy(true);
    try {
      await apiPost(`/api/attorney/beneficiaries/proposed/${id}/reject`, { reason });
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  if (!clientId) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!data) return <div className="p-6">Loading…</div>;

  const isAdmin = data.principal?.isAdmin ?? false;

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border p-5">
        <div className="text-xl font-semibold">{data.client?.name || "Client"}</div>
        <div className="text-sm text-slate-600">{data.client?.email}</div>
      </div>

      {/* Admin-only access control panel */}
      {isAdmin && (
        <AccessControlPanel clientId={clientId} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-5">
          <div className="font-semibold mb-3">Documents</div>
          <div className="space-y-2">
            {docs.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{DocTypeLabel(d.docType)}</div>
                  <div className="text-xs text-slate-600">
                    {d.status} • {d.sensitivity} • v{d.versionNumber}
                    {d.supersededAt ? " • superseded" : ""}
                  </div>
                  {d.processingState && (
                    <div className="text-xs mt-1">
                      <span className={`px-2 py-0.5 rounded ${
                        d.processingState === "PROCESSED" ? "bg-green-100 text-green-700" :
                        d.processingState === "PROCESSING" ? "bg-blue-100 text-blue-700" :
                        d.processingState === "FAILED" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {d.processingState === "QUEUED" ? "Queued" :
                         d.processingState === "PROCESSING" ? "Processing…" :
                         d.processingState === "PROCESSED" ? "Processed" :
                         d.processingState === "FAILED" ? `Failed${(d.processingAttempts ?? 0) >= 5 ? "" : " (retrying)"}` :
                         d.processingState}
                      </span>
                      {(d.processingAttempts ?? 0) > 0 && (
                        <span className="ml-2 text-slate-500">attempts: {d.processingAttempts}</span>
                      )}
                      {d.lastProcessingError && (
                        <span className="ml-2 text-red-600">error logged</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded-lg border" onClick={() => onPreview(d.id)}>
                    Preview
                  </button>
                  <button className="px-3 py-1 rounded-lg border" onClick={() => onOriginalWithReason(d.id)}>
                    Original
                  </button>
                  <button className="px-3 py-1 rounded-lg border" onClick={() => onDownloadWithReason(d.id)}>
                    Download
                  </button>
                </div>
              </div>
            ))}
            {!docs.length && <div className="text-sm text-slate-500">No documents yet.</div>}
          </div>
        </div>

        <div className="rounded-2xl border p-5">
          <div className="font-semibold mb-3">Proposed Beneficiaries (Needs Confirmation)</div>
          <div className="space-y-2">
            {proposed.map((pb: any) => (
              <div key={pb.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{pb.fullName}</div>
                  <div className="text-xs text-slate-600">{pb.status}</div>
                </div>
                <div className="flex gap-2">
                  <button disabled={busy} className="px-3 py-1 rounded-lg border" onClick={() => confirmProposed(pb.id)}>
                    Confirm
                  </button>
                  <button disabled={busy} className="px-3 py-1 rounded-lg border" onClick={() => rejectProposed(pb.id)}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
            {!proposed.length && <div className="text-sm text-slate-500">No proposed beneficiaries.</div>}
          </div>
        </div>
      </div>

      {/* Receipts Panel */}
      {receipts.length > 0 && (
        <ReceiptsPanel
          receipts={receipts.map((r: any) => ({
            id: r.id,
            receiptNumber: r.receiptNumber,
            createdAt: r.createdAt,
            kind: r.kind,
            artifactId: r.artifactId,
          }))}
          onOpen={openReceipt}
        />
      )}
    </div>
  );
}


