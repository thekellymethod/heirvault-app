"use client"

import { useState } from "react"

interface Props {
  clientId: string
  defaultEmail: string
}

export function InviteClientButton({ clientId, defaultEmail }: Props) {
  const [email, setEmail] = useState(defaultEmail || "")
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleInvite() {
    setError(null)
    setInviteUrl(null)

    if (!email) {
      setError("Email is required to send an invite.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create invite.")
      }

      const data = await res.json()
      setInviteUrl(data.inviteUrl)
    } catch (e: any) {
      setError(e.message || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <input
          type="email"
          placeholder="Client email"
          className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="button"
          onClick={handleInvite}
          disabled={loading}
          className="rounded-full border border-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Invite client"}
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-800 rounded px-2 py-1">
          {error}
        </p>
      )}
      {inviteUrl && (
        <div className="text-[11px] text-slate-300 bg-slate-900/60 border border-slate-800 rounded px-2 py-1 max-w-xs">
          Invite link generated:
          <br />
          <span className="break-all">{inviteUrl}</span>
          <br />
          <span className="text-slate-500">
            (Email sending will be wired later.)
          </span>
        </div>
      )}
    </div>
  )
}

