// src/app/upload/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import UploadClient from "./UploadClient";

type Mode = "INVITE" | "CHANGE" | "PAYMENT";

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

export default function UploadPage() {
  const sp = useSearchParams();
  const sessionId = sp.get("session_id");
  const inviteToken = sp.get("token");
  const changeToken = sp.get("changeToken");

  // Existing invite/change token flow
  const modeRaw: Mode | null = inviteToken ? "INVITE" : changeToken ? "CHANGE" : null;
  const token = inviteToken ?? changeToken ?? "";

  // Hooks must be called unconditionally - before any early returns
  const [valid, setValid] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState<string>("Policyholder");
  const [err, setErr] = useState<string | null>(null);

  // Payment-based upload flow
  if (sessionId) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Upload Life Insurance Policies</h1>
        <p style={{ marginTop: 8 }}>
          Upload any policy PDFs, annual statements, or declaration pages. Do not upload passwords.
        </p>
        <div style={{ marginTop: 24 }}>
          <UploadClient sessionId={sessionId} />
        </div>
      </div>
    );
  }

  useEffect(() => {
    (async () => {
      if (!modeRaw) {
        setValid(false);
        setErr("Missing secure link token.");
        return;
      }
      try {
        setErr(null);
        const url = modeRaw === "INVITE" ? "/api/public/invite/validate" : "/api/public/change-request/validate";
        const r = await postJson(url, { token });
        setValid(!!r.valid);
        if (r.displayName) setDisplayName(r.displayName);
      } catch (e) {
        const error = e as Error;
        setValid(false);
        setErr(error?.message ?? "Invalid link.");
      }
    })();
  }, [modeRaw, token]);

  if (valid === null) return <div className="p-6">Loading…</div>;
  if (!valid) return <div className="p-6 text-red-600">{err ?? "Invalid link."}</div>;
  if (!modeRaw) return <div className="p-6 text-red-600">Invalid mode.</div>;

  // TypeScript now knows modeRaw is not null
  const mode = modeRaw as Mode;

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      <div className="rounded-2xl border p-5">
        <div className="text-xl font-semibold">Secure Upload</div>
        <div className="text-sm text-slate-600">{displayName}</div>
      </div>

      {/* Replace below with your UploadWizard component. This is the wiring skeleton. */}
      <UploadWizard mode={mode} token={token} />
      <StatusPanel mode={mode} token={token} />
    </div>
  );
}

function UploadWizard({ mode, token }: { mode: Mode; token: string }) {
  const [docType, setDocType] = useState("POLICY");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");

  const uploadUrl = mode === "INVITE" ? "/api/public/upload" : "/api/public/change-request/upload";
  const submitUrl = mode === "INVITE" ? "/api/public/intake/submit" : "/api/public/change-request/submit";

  const upload = async () => {
    if (!file) return;
    setMsg("");
    const fd = new FormData();
    fd.append("token", token);
    fd.append("docType", docType);
    fd.append("file", file);

    const res = await fetch(uploadUrl, { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setMsg(json?.error ?? "Upload failed");
    else {
      setMsg("Received.");
      setFile(null);
    }
  };

  const submit = async () => {
    setMsg("");
    try {
      const res = await fetch(submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(json?.error ?? "Submit failed");
      else setMsg("Receipt sent.");
    } catch (e) {
      const error = e as Error;
      setMsg(error?.message ?? "Submit failed");
    }
  };

  return (
    <div className="rounded-2xl border p-5 space-y-3">
      <div className="font-semibold">Upload Documents</div>

      <div className="flex gap-2">
        <select className="border rounded-lg px-3 py-2 flex-1" value={docType} onChange={(e) => setDocType(e.target.value)}>
          <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
          <option value="POLICY">Insurance Policy</option>
          <option value="BENEFICIARY_DOC">Beneficiary Document</option>
          <option value="TAX_W9">Tax Form</option>
          <option value="TAX_1040">Tax Return</option>
          <option value="TAX_OTHER">Tax Document</option>
          <option value="OTHER">Other</option>
        </select>

        <input
          className="border rounded-lg px-3 py-2"
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex gap-2">
        <button className="px-4 py-2 rounded-lg border" onClick={upload} disabled={!file}>
          Upload
        </button>
        <button className="px-4 py-2 rounded-lg border" onClick={submit}>
          Submit & Receive Receipt
        </button>
      </div>

      {msg && <div className="text-sm text-slate-700">{msg}</div>}
      <div className="text-xs text-slate-500">
        For security, document previews and downloads are not available on this page.
      </div>
    </div>
  );
}

type StatusData = {
  ok: boolean;
  receipts?: string[];
  receipt?: string[];
  documents?: Array<{
    type: string;
    status: string;
  }>;
};

function StatusPanel({ mode, token }: { mode: Mode; token: string }) {
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    const tick = async () => {
      try {
        const url = mode === "INVITE" ? "/api/public/intake/status" : "/api/public/change-request/status";
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = await res.json().catch(() => ({})) as StatusData | { ok?: boolean };
        setStatus(json?.ok ? (json as StatusData) : null);
      } catch (_e) {
        // Silent fail
      }
    };
    tick();
    const id = window.setInterval(tick, 4000);
    return () => window.clearInterval(id);
  }, [mode, token]);

  return (
    <div className="rounded-2xl border p-5 space-y-2">
      <div className="font-semibold">Status</div>
      {!status && <div className="text-sm text-slate-500">Checking…</div>}
      {status && (
        <>
          <div className="text-sm text-slate-700">
            Receipts: {status.receipts?.length ? status.receipts.join(", ") : status.receipt?.length ? status.receipt.join(", ") : "—"}
          </div>
          <div className="space-y-1">
            {(status.documents ?? []).map((d, idx) => (
              <div key={idx} className="text-sm">
                {d.type} — <span className="text-slate-600">{d.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
