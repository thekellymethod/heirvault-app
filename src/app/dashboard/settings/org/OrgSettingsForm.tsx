"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

interface Org {
  id: string
  name: string
  slug: string
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  phone: string | null
  logoUrl: string | null
}

interface Props {
  org: Org
}

export function OrgSettingsForm({ org }: Props) {
  const router = useRouter()
  const [name, setName] = useState(org.name)
  const [addressLine1, setAddressLine1] = useState(org.addressLine1 || "")
  const [addressLine2, setAddressLine2] = useState(org.addressLine2 || "")
  const [city, setCity] = useState(org.city || "")
  const [state, setState] = useState(org.state || "")
  const [postalCode, setPostalCode] = useState(org.postalCode || "")
  const [country, setCountry] = useState(org.country || "")
  const [phone, setPhone] = useState(org.phone || "")
  const [logoUrl, setLogoUrl] = useState(org.logoUrl || "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!name) {
      setError("Organization name is required.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          postalCode: postalCode || null,
          country: country || null,
          phone: phone || null,
          logoUrl: logoUrl || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update organization.")
      }

      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card p-6 space-y-4"
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Settings saved successfully.
        </div>
      )}

      <div>
        <label className="label">
          Organization name <span className="text-red-500">*</span>
        </label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label">
          Address line 1
        </label>
        <input
          className="input"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
        />
      </div>

      <div>
        <label className="label">
          Address line 2
        </label>
        <input
          className="input"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">
            City
          </label>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div>
          <label className="label">
            State
          </label>
          <input
            className="input"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">
            Postal code
          </label>
          <input
            className="input"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
          />
        </div>
        <div>
          <label className="label">
            Country
          </label>
          <input
            className="input"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">
          Phone
        </label>
        <input
          type="tel"
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div>
        <label className="label">
          Logo URL
        </label>
        <input
          type="url"
          className="input"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
        >
          {submitting ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  )
}

