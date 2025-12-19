"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ClientInviteCodePage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!inviteCode.trim()) {
      setError("Invitation code is required");
      return;
    }

    setSubmitting(true);
    try {
      // Redirect to invite page with the token
      router.push(`/invite/${inviteCode.trim()}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper-50">
      {/* Header */}
      <header className="border-b border-slateui-200 bg-paper-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" showTagline={false} className="flex-row gap-3" href="/" />
            <Link
              href="/"
              className="text-sm font-medium text-slateui-600 hover:text-ink-900 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-6 sm:py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="card p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-ink-900">
                Enter Your Invitation Code
              </h1>
              <p className="mt-3 text-sm text-slateui-600">
                Your attorney has provided you with an invitation code. Enter it below to register your policy information.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="invite-code" className="label mb-1 block">
                  Invitation Code
                </label>
                <input
                  id="invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter your invitation code"
                  className="input"
                  required
                  autoFocus
                />
                <p className="mt-2 text-xs text-slateui-500">
                  This code was provided by your attorney. If you don't have a code, please contact your attorney.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? "Processing..." : "Continue"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slateui-200 text-center">
              <p className="text-xs text-slateui-500">
                Need help? Contact your attorney or{" "}
                <Link href="/" className="text-gold-600 hover:text-gold-700 underline">
                  return to home
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

