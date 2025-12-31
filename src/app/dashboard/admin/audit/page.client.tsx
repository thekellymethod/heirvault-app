// src/app/dashboard/admin/audit/page.client.tsx
"use client";

import { useState } from "react";

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

type AuditLog = {
  id: string;
  action: string;
  createdAt: string;
  clientId: string;
  actorType: string;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AccessEvent = {
  id: string;
  action: string;
  createdAt: string;
  documentId: string;
  actorType: string;
  actorId?: string | null;
  reason?: string | null;
};

export default function AuditClient() {
  const [clientId, setClientId] = useState("");
  const [action, setAction] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const searchLogs = async () => {
    setErr(null);
    try {
      const r = await postJson("/api/admin/audit/search", {
        clientId: clientId || undefined,
        action: action || undefined,
        limit: 200,
      }) as { logs?: AuditLog[] };
      setLogs(r.logs ?? []);
    } catch (e) {
      const error = e as Error;
      setErr(error?.message ?? "Failed");
    }
  };

  const searchEvents = async () => {
    setErr(null);
    try {
      const r = await postJson("/api/admin/audit/access-events", {
        documentId: documentId || undefined,
        limit: 200,
      }) as { events?: AccessEvent[] };
      setEvents(r.events ?? []);
    } catch (e) {
      const error = e as Error;
      setErr(error?.message ?? "Failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-2xl font-semibold">Audit Explorer (Admin)</div>
      {err && <div className="text-red-600">{err}</div>}

      <div className="rounded-2xl border p-5 space-y-3">
        <div className="font-semibold">Audit Logs</div>
        <div className="flex flex-col gap-2">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="clientId (optional)"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="action (optional)"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
          <button className="px-4 py-2 rounded-lg border w-fit" onClick={searchLogs}>
            Search
          </button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((l) => (
            <div key={l.id} className="rounded-xl border px-3 py-2 text-sm">
              <div className="font-medium">{l.action}</div>
              <div className="text-xs text-slate-600">
                {new Date(l.createdAt).toLocaleString()} • client {l.clientId} • actor {l.actorType} {l.actorId ?? ""}
              </div>
              {l.metadata && (
                <pre className="text-xs overflow-auto mt-1 bg-slate-50 p-2 rounded">
                  {JSON.stringify(l.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {!logs.length && <div className="text-sm text-slate-500">No results.</div>}
        </div>
      </div>

      <div className="rounded-2xl border p-5 space-y-3">
        <div className="font-semibold">Document Access Events</div>
        <div className="flex flex-col gap-2">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="documentId (optional)"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
          />
          <button className="px-4 py-2 rounded-lg border w-fit" onClick={searchEvents}>
            Search
          </button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.map((e) => (
            <div key={e.id} className="rounded-xl border px-3 py-2 text-sm">
              <div className="font-medium">{e.action}</div>
              <div className="text-xs text-slate-600">
                {new Date(e.createdAt).toLocaleString()} • doc {e.documentId} • actor {e.actorType} {e.actorId ?? ""}
              </div>
              {e.reason && (
                <div className="text-xs mt-1">
                  <b>Reason:</b> {e.reason}
                </div>
              )}
            </div>
          ))}
          {!events.length && <div className="text-sm text-slate-500">No results.</div>}
        </div>
      </div>
    </div>
  );
}

