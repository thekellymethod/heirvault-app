"use client";

import { useState } from "react";
import styles from "./page.module.css";

interface Receipt {
  receiptId: string | number;
  registryId: string | number;
  updateToken: string,
  updateUrl: string,
  createdAt: string | Date;
  confirmationMessage: string,
}

export default function IntakePage() {
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReceipt(null);

    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/intake", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.details || json?.error || "Submission failed");
      setReceipt(json);
    } catch (err: unknown) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <h1>Policy Intake</h1>

      <form onSubmit={onSubmit} className={styles.form}>
        <input name="insured_name" placeholder="Insured Name (required)" required />
        <input name="carrier_guess" placeholder="Carrier (optional)" />
        <input name="policyholder_name" placeholder="Policyholder Name (optional)" />
        <input name="beneficiary_name" placeholder="Beneficiary Name (optional)" />
        <input name="policy_number_optional" placeholder="Policy Number (optional)" />
        <textarea name="notes_optional" placeholder="Notes (optional)" rows={4} />
        <label>
          Document (PDF, JPEG, or PNG)
          <input name="document" type="file" accept="application/pdf,image/jpeg,image/png" />
        </label>
        <button disabled={loading} type="submit">
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {receipt && (
        <section className={styles.receipt}>
          <h2>Receipt</h2>
          <p><strong>Receipt ID:</strong> {receipt.receiptId}</p>
          <p><strong>Registry ID:</strong> {receipt.registryId}</p>
          <p><strong>Update URL:</strong> <code>{receipt.updateUrl}</code></p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(window.location.origin + receipt.updateUrl)}
          >
            Copy Update Link
          </button>
        </section>
      )}
    </main>
  );
}
