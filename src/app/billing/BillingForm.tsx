"use client";

import { useState } from "react";

export default function BillingForm() {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onPay() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientName, clientEmail }),
      });

      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Checkout failed";
      alert(errorMessage);
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label>
        Name
        <input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
          placeholder="Client full name"
        />
      </label>

      <label>
        Email
        <input
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
          placeholder="client@email.com"
        />
      </label>

      <button
        onClick={onPay}
        disabled={loading || !clientEmail}
        style={{ padding: 12, fontWeight: 700 }}
      >
        {loading ? "Redirecting…" : "Pay $750"}
      </button>

      <p style={{ fontSize: 12, opacity: 0.75 }}>
        Payment constitutes acceptance of the engagement terms. Do not upload passwords.
      </p>
    </div>
  );
}
