// src/app/dashboard/review/page.client.tsx
"use client";

import { useEffect, useState } from "react";

async function getJson(url: string) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Request failed");
  return json;
}
async function postJson(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Request failed");
  return json;
}

function dtLabel(dt: string) {
  const m: Record<string, string> = {
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
  return m[dt] ?? "Document";
}

type Document = {
  documentId: string;
  clientName: string;
  docType: string;
  sensitivity: string;
  confidenceScore?: number | null;
  createdAt: string;
};

type ChangeRequest = {
  changeRequestId: string;
  clientId: string;
  clientName: string;
  requestType: string;
  status: string;
  createdAt: string;
};

type ReviewData = {
  documents?: Document[];
  changeRequests?: ChangeRequest[];
};

export default function ReviewQueueClient() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const r = await getJson("/api/review/queue") as ReviewData;
      setData(r);
    } catch (e) {
      const error = e as Error;
      setErr(error?.message ?? "Failed to load");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approveDoc = async (documentId: string) => {
    setBusyId(documentId);
    try {
      await postJson(`/api/review/documents/${documentId}/approve`, {});
      await load();
    } catch (e) {
      const error = e as Error;
      alert(error?.message ?? "Failed to approve");
    } finally {
      setBusyId(null);
    }
  };

  const rejectDoc = async (documentId: string) => {
    const reason = window.prompt("Rejection reason (required, minimum 5 characters):");
    if (!reason || reason.trim().length < 5) return;
    setBusyId(documentId);
    try {
      await postJson(`/api/review/documents/${documentId}/reject`, { reason });
      await load();
    } catch (e) {
      const error = e as Error;
      alert(error?.message ?? "Failed to reject");
    } finally {
      setBusyId(null);
    }
  };

  const previewDoc = async (documentId: string) => {
    try {
      const r = await getJson(`/api/documents/${documentId}/preview`) as { url?: string };
      if (r?.url) window.open(r.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      const error = e as Error;
      alert(error?.message ?? "Failed to preview");
    }
  };

  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!data) return <div className="p-6">Loading…</div>;

  const docs = data.documents ?? [];
  const crs = data.changeRequests ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="text-2xl font-semibold">Review Queue</div>

      <div className="rounded-2xl border p-5">
        <div className="font-semibold mb-3">Documents Needing Review</div>
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.documentId} className="flex items-center justify-between rounded-xl border px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">
                  {d.clientName} — {dtLabel(d.docType)}
                </div>
                <div className="text-xs text-slate-600">
                  {d.sensitivity} • score {d.confidenceScore ?? "—"} • {new Date(d.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded-lg border text-sm" onClick={() => previewDoc(d.documentId)}>
                  Preview
                </button>
                <button
                  disabled={busyId === d.documentId}
                  className="px-3 py-1 rounded-lg border text-sm bg-green-50"
                  onClick={() => approveDoc(d.documentId)}
                >
                  Approve
                </button>
                <button
                  disabled={busyId === d.documentId}
                  className="px-3 py-1 rounded-lg border text-sm bg-red-50"
                  onClick={() => rejectDoc(d.documentId)}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {!docs.length && <div className="text-sm text-slate-500">No documents waiting.</div>}
        </div>
      </div>

      <div className="rounded-2xl border p-5">
        <div className="font-semibold mb-3">Change Requests</div>
        <div className="space-y-2">
          {crs.map((c) => (
            <div key={c.changeRequestId} className="flex items-center justify-between rounded-xl border px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{c.clientName} — {c.requestType}</div>
                <div className="text-xs text-slate-600">{c.status} • {new Date(c.createdAt).toLocaleString()}</div>
              </div>
              <a className="px-3 py-1 rounded-lg border text-sm" href={`/dashboard/clients/${c.clientId}`}>
                Open Client
              </a>
            </div>
          ))}
          {!crs.length && <div className="text-sm text-slate-500">No change requests waiting.</div>}
        </div>
      </div>
    </div>
  );
}

