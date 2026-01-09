"use client";

import { useState } from "react";

export default function SubmitPolicyPage() {
  const [status, setStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("Submitting…");
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);

      const res = await fetch("/api/submit-policy", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(err?.error || "Submission failed.");
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      setStatus(`Submission received. Reference ID: ${data.reference_id}`);
      e.currentTarget.reset();
    } catch (error) {
      setStatus("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 20 }}>
      <h1>HeirVault Policy Submission</h1>

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Insured Full Legal Name *
          </label>
          <input
            name="insured_name"
            required
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Date of Birth
          </label>
          <input
            name="dob"
            type="date"
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Carrier Name
          </label>
          <input
            name="carrier"
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Policy Number or Partial Identifier
          </label>
          <input
            name="policy_number"
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Your Email Address *
          </label>
          <input
            name="submitted_by_email"
            type="email"
            required
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Upload Policy or Confirmation (PDF) *
          </label>
          <input
            name="file"
            type="file"
            accept="application/pdf"
            required
            style={{
              width: "100%",
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "10px 20px",
            backgroundColor: isSubmitting ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>
      </form>

      {status && (
        <p
          style={{
            marginTop: 20,
            padding: 12,
            backgroundColor: status.includes("received") ? "#d4edda" : "#f8d7da",
            border: `1px solid ${status.includes("received") ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: 4,
            color: status.includes("received") ? "#155724" : "#721c24",
          }}
        >
          {status}
        </p>
      )}
    </div>
  );
}
