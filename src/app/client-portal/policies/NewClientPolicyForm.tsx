"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export function NewClientPolicyForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [insurerName, setInsurerName] = useState("")
  const [policyType, setPolicyType] = useState("")
  const [policyNumber, setPolicyNumber] = useState("")
  const [insurerPhone, setInsurerPhone] = useState("")
  const [insurerEmail, setInsurerEmail] = useState("")
  const [insurerWebsite, setInsurerWebsite] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!insurerName) {
      setError("Insurer name is required.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          insurerName,
          insurerPhone: insurerPhone || null,
          insurerEmail: insurerEmail || null,
          insurerWebsite: insurerWebsite || null,
          policyType: policyType || null,
          policyNumber: policyNumber || null,
        }),
      })

      if (!res.ok) {
        // Check content-type before parsing JSON
        const contentType = res.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text()
          throw new Error(
            res.status === 500
              ? "Server error. Please try again later."
              : `Unexpected response format. Status: ${res.status}`
          )
        }
        const data = await res.json()
        throw new Error(data.error || "Failed to save policy.")
      }

      setInsurerName("")
      setPolicyType("")
      setPolicyNumber("")
      setInsurerPhone("")
      setInsurerEmail("")
      setInsurerWebsite("")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs"
    >
      {error && (
        <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-800 rounded px-2 py-1">
          {error}
        </p>
      )}

      <div>
        <label className="block text-[11px] font-medium text-slate-300">
          Insurer name <span className="text-red-400">*</span>
        </label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          value={insurerName}
          onChange={(e) => setInsurerName(e.target.value)}
          required
          placeholder="Horizon Life Insurance Co."
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-[11px] font-medium text-slate-300">
            Policy type
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={policyType}
            onChange={(e) => setPolicyType(e.target.value)}
          >
            <option value="">Select</option>
            <option value="TERM">Term</option>
            <option value="WHOLE">Whole</option>
            <option value="GROUP">Group</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-300">
            Policy number (optional)
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            placeholder="POL-123456"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-300">
            Insurer phone
          </label>
          <input
            type="tel"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={insurerPhone}
            onChange={(e) => setInsurerPhone(e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-300">
            Insurer email
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={insurerEmail}
            onChange={(e) => setInsurerEmail(e.target.value)}
            placeholder="contact@insurer.com"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-300">
            Insurer website
          </label>
          <input
            type="url"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={insurerWebsite}
            onChange={(e) => setInsurerWebsite(e.target.value)}
            placeholder="https://insurer.com"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Add policy"}
        </button>
      </div>
    </form>
  )
}

