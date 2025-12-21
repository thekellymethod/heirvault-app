"use client";

import { useState } from "react";

export default function UpdateForm(props: { token: string; defaultInsured: string; defaultCarrier: string }) {
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReceipt(null);

    const fd = new FormData(e.currentTarget);
    fd.set("token", props.token);

    try {
      const res = await fetch("/api/records", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.details || json?.error || "Update failed");
      setReceipt(json);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: 16 }}>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input name="insured_name" defaultValue={props.defaultInsured} />
        <input name="carrier_guess" defaultValue={props.defaultCarrier} />
        <input name="policyholder_name" placeholder="Policyholder Name (optional)" />
        <input name="beneficiary_name" placeholder="Beneficiary Name (optional)" />
        <input name="policy_number_optional" placeholder="Policy Number (optional)" />
        <textarea name="notes_optional" placeholder="Notes (optional)" rows={4} />
        <input name="document" type="file" accept="application/pdf,image/jpeg,image/png" />
        <button disabled={loading} type="submit">
          {loading ? "Submitting..." : "Submit Update"}
        </button>
      </form>

      {error && <p style={{ color: "crimson", marginTop: 16 }}>{error}</p>}
      {receipt && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <p><strong>Receipt ID:</strong> {receipt.receiptId}</p>
          <p><strong>Timestamp:</strong> {receipt.createdAt}</p>
        </div>
      )}
    </section>
  );
}

