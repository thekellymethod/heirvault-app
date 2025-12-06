"use client"

import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Props {
  inviteId: string
  clientName: string
  email: string
  token: string
  isAuthenticated: boolean
}

export function InvitePortal(props: Props) {
  const { inviteId, clientName, email, token, isAuthenticated } = props
  const { user } = useUser()
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "linking" | "linked" | "error">(
    "idle",
  )
  const [error, setError] = useState<string | null>(null)

  // If already authenticated, try to link immediately
  useEffect(() => {
    if (!isAuthenticated || status !== "idle") return
    void linkInvite()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  async function linkInvite() {
    setStatus("linking")
    setError(null)

    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to link invitation.")
      }

      setStatus("linked")
      setTimeout(() => {
        router.push("/dashboard") // Redirect to dashboard for now
      }, 1000)
    } catch (e: any) {
      setStatus("error")
      setError(e.message || "Something went wrong.")
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
          <h1 className="text-lg font-semibold">
            Accept invitation to your registry
          </h1>
          <p className="text-sm text-slate-300">
            You&apos;ve been invited to complete your Life Insurance &amp;
            Beneficiary Registry for{" "}
            <span className="font-semibold">{clientName}</span>.
          </p>
          <p className="text-xs text-slate-400">
            To proceed, sign in or create an account using your email:{" "}
            <span className="text-slate-100">{email}</span>.
          </p>

          <div className="flex flex-col gap-2 pt-2 text-xs">
            <SignInButton mode="modal" redirectUrl={`/invite/${token}`}>
              <button className="w-full rounded-full border border-slate-700 px-3 py-2 text-xs hover:border-emerald-400 hover:text-emerald-300">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal" redirectUrl={`/invite/${token}`}>
              <button className="w-full rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400">
                Create account
              </button>
            </SignUpButton>
          </div>
        </div>
      </main>
    )
  }

  // Authenticated state
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-3">
        <h1 className="text-lg font-semibold">Linking your registry</h1>
        <p className="text-sm text-slate-300">
          We are linking this invitation to your account (
          <span className="font-mono text-xs">{user?.primaryEmailAddress?.emailAddress}</span>
          ) so you can manage your policies and beneficiaries securely.
        </p>

        {status === "linking" && (
          <p className="text-xs text-slate-400">Linking invitation...</p>
        )}
        {status === "linked" && (
          <p className="text-xs text-emerald-300">
            Linked. Redirecting you to your registry...
          </p>
        )}
        {status === "error" && error && (
          <p className="text-xs text-red-400">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}

