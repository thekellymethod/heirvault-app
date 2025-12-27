// src/app/upload/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const DOC_TYPES = [
  { value: "DRIVERS_LICENSE", label: "Driver's License" },
  { value: "POLICY", label: "Insurance Policy" },
  { value: "BENEFICIARY_DOC", label: "Beneficiary Document (if applicable)" },
  { value: "TAX_OTHER", label: "Tax Document (if requested)" },
];

export default function UploadPage() {
  const sp = useSearchParams();
  const tokenFromUrl = sp.get("token") || "";
  const changeTokenFromUrl = sp.get("changeToken") || "";
  const isChangeRequest = !!changeTokenFromUrl;
  const [token, setToken] = useState(isChangeRequest ? changeTokenFromUrl : tokenFromUrl);
  const [valid, setValid] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [requestType, setRequestType] = useState<string>("");
  const [docType, setDocType] = useState("DRIVERS_LICENSE");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      setMsg("");
      const endpoint = isChangeRequest ? "/api/public/change-request/validate" : "/api/public/invite/validate";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setValid(!!data.valid);
      if (data.valid) {
        setName(data.displayName || "");
        if (data.requestType) setRequestType(data.requestType);
      }
      if (!data.valid) setMsg(isChangeRequest ? "Change request is invalid or expired." : "Invite is invalid or expired.");
    })();
  }, [token, isChangeRequest]);

  const canUpload = useMemo(() => valid && token && file, [valid, token, file]);

  async function uploadOne() {
    setMsg("");
    if (!canUpload || !file) return;
    const fd = new FormData();
    fd.set("token", token);
    fd.set("docType", docType);
    fd.set("file", file);

    const endpoint = isChangeRequest ? "/api/public/change-request/upload" : "/api/public/upload";
    const res = await fetch(endpoint, { method: "POST", body: fd });
    if (!res.ok) {
      const t = await res.json().catch(() => ({}));
      setMsg(t.error || "Upload failed.");
      return;
    }
    setFile(null);
    setMsg("Document received.");
  }

  async function submitIntake() {
    setMsg("");
    const endpoint = isChangeRequest ? "/api/public/change-request/submit" : "/api/public/intake/submit";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const t = await res.json().catch(() => ({}));
      setMsg(t.error || "Submission failed.");
      return;
    }
    setMsg(isChangeRequest 
      ? "Change request received. A receipt has been sent to your email."
      : "Submission received. A receipt has been sent to your email.");
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Secure Document Upload</h1>

      <div style={{ marginTop: 12 }}>
        <label>{isChangeRequest ? "Change Request Token" : "Invite Link Code"}</label>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 6 }}
          placeholder={isChangeRequest ? "Paste your change request token" : "Paste your invite token"}
        />
      </div>

      {valid && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd" }}>
          <div><b>Policyholder:</b> {name}</div>
          {requestType && (
            <div style={{ marginTop: 6, fontSize: 13 }}>
              <b>Request Type:</b> {requestType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 13 }}>
            {isChangeRequest 
              ? "Upload updated documents for your change request. Your receipt will be emailed after submission."
              : "Upload the requested documents. Your receipt will be emailed after submission."}
          </div>
        </div>
      )}

      {valid && (
        <>
          <div style={{ marginTop: 16 }}>
            <label>Document Type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6 }}>
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Select File</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ width: "100%", padding: 10, marginTop: 6 }} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={uploadOne} disabled={!canUpload} style={{ padding: 10 }}>
              Upload Document
            </button>
            <button onClick={submitIntake} disabled={!valid} style={{ padding: 10 }}>
              {isChangeRequest ? "Submit Change Request (Email Receipt)" : "Submit Intake (Email Receipt)"}
            </button>
          </div>
        </>
      )}

      {msg && <p style={{ marginTop: 16 }}>{msg}</p>}
    </div>
  );
}

