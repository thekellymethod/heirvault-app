"use client"

import { useRouter, useParams } from "next/navigation"
import { FormEvent, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function NewPolicyPage() {
  const params = useParams()
  const clientId = params.id as string
  const router = useRouter()
  const [insurerName, setInsurerName] = useState("")
  const [policyNumber, setPolicyNumber] = useState("")
  const [policyType, setPolicyType] = useState<"TERM" | "WHOLE" | "GROUP" | "OTHER" | "">("")
  const [insurerPhone, setInsurerPhone] = useState("")
  const [insurerWebsite, setInsurerWebsite] = useState("")
  const [insurerEmail, setInsurerEmail] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          policyNumber: policyNumber || null,
          policyType: policyType || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create policy.")
      }

      router.push(`/dashboard/clients/${clientId}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="p-8 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/clients/${clientId}`}
          className="text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Add Policy</h1>
          <p className="text-sm text-slate-400">Create a new policy record</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/50 p-6"
      >
        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded p-2">
            {error}
          </p>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Insurer name <span className="text-red-400">*</span>
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={insurerName}
            onChange={(e) => setInsurerName(e.target.value)}
            required
            placeholder="Horizon Life Insurance Co."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Policy number
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              placeholder="POL-123456"
            />
          </div>
          <div>
            <label htmlFor="policy-type" className="block text-xs font-medium text-slate-300 mb-1">
              Policy type
            </label>
            <select
              id="policy-type"
              name="policy-type"
              title="Policy type"
              aria-label="Policy type"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={policyType}
              onChange={(e) => setPolicyType(e.target.value as "TERM" | "WHOLE" | "GROUP" | "OTHER" | "")}
            >
              <option value="">Select</option>
              <option value="TERM">Term</option>
              <option value="WHOLE">Whole</option>
              <option value="GROUP">Group</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Insurer phone
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={insurerPhone}
              onChange={(e) => setInsurerPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Insurer email
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={insurerEmail}
              onChange={(e) => setInsurerEmail(e.target.value)}
              placeholder="contact@insurer.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Insurer website
          </label>
          <input
            type="url"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={insurerWebsite}
            onChange={(e) => setInsurerWebsite(e.target.value)}
            placeholder="https://insurer.com"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? "Saving..." : "Save policy"}
          </button>
        </div>
      </form>
    </main>
  )
}

