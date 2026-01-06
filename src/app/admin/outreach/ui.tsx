"use client";

import { useMemo, useState } from "react";

type Row = {
  firm: string;
  attorney: string;
  email: string;
};

function parseBulk(input: string): Row[] {
  // Accept CSV or tab-delimited or "firm | attorney | email" lines.
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Detect header
  const hasHeader = /firm/i.test(lines[0]) && /email/i.test(lines[0]);
  const startIdx = hasHeader ? 1 : 0;

  const rows: Row[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    // Try comma first
    let parts = line.split(",").map((p) => p.trim());

    // If not enough columns, try tab
    if (parts.length < 3) parts = line.split("\t").map((p) => p.trim());

    // If not enough, try pipe
    if (parts.length < 3) parts = line.split("|").map((p) => p.trim());

    if (parts.length < 3) continue;

    const firm = parts[0] || "";
    const attorney = parts[1] || "";
    const email = parts[2] || "";

    // Basic email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;

    rows.push({ firm, attorney, email });
  }

  // De-dup by email
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function OutreachConsole() {
  const [singleFirm, setSingleFirm] = useState("");
  const [singleAttorney, setSingleAttorney] = useState("");
  const [singleEmail, setSingleEmail] = useState("");

  const [bulkText, setBulkText] = useState("");
  const parsed = useMemo(() => parseBulk(bulkText), [bulkText]);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>("");

  const adminToken =
    (process.env.NEXT_PUBLIC_ADMIN_TOKEN as string) || ""; // simple, minimal

  async function sendSingle() {
    setSending(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/outreach/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          mode: "single",
          subject: "Life insurance documentation gaps we're seeing in estates",
          from: process.env.NEXT_PUBLIC_MAIL_FROM || "HeirVault <support@heirvault.app>",
          row: { firm: singleFirm, attorney: singleAttorney, email: singleEmail },
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(`Sent: ${data.sentCount} (failed: ${data.failedCount})`);
    } catch (e: any) {
      setResult(e?.message ?? "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function sendBulk() {
    setSending(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/outreach/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          mode: "bulk",
          subject: "Life insurance documentation gaps we're seeing in estates",
          from: process.env.NEXT_PUBLIC_MAIL_FROM || "HeirVault <support@heirvault.app>",
          rows: parsed,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(
        `Sent: ${data.sentCount} (failed: ${data.failedCount})` +
          (data.failed?.length ? `\nFailed: ${data.failed.join(", ")}` : "")
      );
    } catch (e: any) {
      setResult(e?.message ?? "Bulk send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* SINGLE */}
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <h3 style={{ margin: 0 }}>Single Send</h3>
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <label>
            Firm name
            <input
              value={singleFirm}
              onChange={(e) => setSingleFirm(e.target.value)}
              style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
              placeholder="Example Law Group, PLLC"
            />
          </label>
          <label>
            Attorney name
            <input
              value={singleAttorney}
              onChange={(e) => setSingleAttorney(e.target.value)}
              style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
              placeholder="Jane Smith"
            />
          </label>
          <label>
            Email
            <input
              value={singleEmail}
              onChange={(e) => setSingleEmail(e.target.value)}
              style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
              placeholder="jane@firm.com"
            />
          </label>

          <button
            onClick={sendSingle}
            disabled={sending || !singleEmail}
            style={{ padding: 12, fontWeight: 800 }}
          >
            {sending ? "Sending…" : "Send Email"}
          </button>
        </div>
      </div>

      {/* BULK */}
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <h3 style={{ margin: 0 }}>Bulk Send</h3>
        <p style={{ marginTop: 6, opacity: 0.8 }}>
          Paste CSV lines: <b>firm, attorney, email</b>. Header row optional.
        </p>

        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          style={{ width: "100%", minHeight: 160, padding: 10, marginTop: 8, fontFamily: "monospace" }}
          placeholder={`firm,attorney,email
Evans & Davis,John Doe,attorneys@evansdavis.com
Example Firm PLLC,Jane Smith,jane@examplefirm.com`}
        />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Parsed rows: <b>{parsed.length}</b>
          </div>
          <button
            onClick={sendBulk}
            disabled={sending || parsed.length === 0}
            style={{ padding: "10px 12px", fontWeight: 800 }}
          >
            {sending ? "Sending…" : `Send Bulk (${parsed.length})`}
          </button>
        </div>

        {parsed.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Preview (first 10):</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {parsed.slice(0, 10).map((r) => (
                <li key={r.email}>
                  <b>{r.firm}</b> — {r.attorney || "(no name)"} — {r.email}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* RESULT */}
      {result && (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#fafafa",
            border: "1px solid #eee",
            padding: 12,
            borderRadius: 10,
          }}
        >
          {result}
        </pre>
      )}
    </div>
  );
}
