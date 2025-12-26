"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { CheckCircle, Copy, ExternalLink } from "lucide-react";

interface InviteData {
  inviteId: string,
  inviteUrl: string,
  token: string,
  expiresAt: string,
  clientId: string,
  email: string,
  clientName?: string,
}

export default function CreateTestInvitePage() {
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen bg-paper-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-6">Access Denied</h1>
          <p className="text-slateui-600">This page is only available in development mode.</p>
        </div>
      </div>
    );
  }

  async function createTestInvite() {
    setLoading(true);
    setError(null);
    setInviteData(null);

    try {
      const res = await fetch("/api/test/create-invite", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create test invite");
      }

      setInviteData(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-paper-50 py-12">
      <div className="mx-auto max-w-2xl px-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Logo size="sm" showTagline={false} className="flex-row gap-3" href="/" />
          <Link
            href="/"
            className="text-sm font-medium text-slateui-600 hover:text-ink-900 transition"
          >
            Back to Home
          </Link>
        </div>

        {/* Content */}
        <div className="card p-8">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-ink-900">
              Create Test Invitation Code
            </h1>
            <p className="mt-2 text-sm text-slateui-600">
              Generate a test invitation code to test the client invitation flow.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!inviteData && (
            <div className="text-center">
              <Button
                onClick={createTestInvite}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Creating..." : "Create Test Invitation Code"}
              </Button>
            </div>
          )}

          {inviteData && (
            <div className="space-y-6">
              <div className="rounded-xl border border-gold-200 bg-gold-50 p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-gold-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h2 className="font-display text-lg font-semibold text-ink-900 mb-2">
                      Test Invitation Created!
                    </h2>
                    <p className="text-sm text-slateui-600">
                      Use the information below to test the client invitation flow.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label mb-1 block" htmlFor="invitation-code-input" title="Invitation Code">
                    Invitation Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="invitation-code-input"
                      type="text"
                      readOnly
                      value={inviteData.token}
                      className="input flex-1 font-mono text-lg font-semibold text-gold-700"
                      aria-label="Invitation Code"
                      title="Invitation Code"
                      placeholder="Invitation Code"
                    />
                    <Button
                      onClick={() => copyToClipboard(inviteData.token)}
                      className="btn-secondary"
                      title="Copy code"
                    >
                      {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="label mb-1 block" htmlFor="invite-url-input" title="Direct Invite URL">
                    Direct Invite URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="invite-url-input"
                      type="text"
                      readOnly
                      value={inviteData.inviteUrl}
                      className="input flex-1 font-mono text-sm"
                      aria-label="Direct Invite URL"
                      title="Direct Invite URL"
                      placeholder="Direct Invite URL"
                    />
                    <Button
                      onClick={() => copyToClipboard(inviteData.inviteUrl)}
                      className="btn-secondary"
                      title="Copy URL"
                    >
                      {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={() => window.open(inviteData.inviteUrl, "_blank")}
                      className="btn-secondary"
                      title="Open URL"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-slateui-200 bg-paper-50 p-4">
                  <h3 className="font-semibold text-ink-900 mb-2">Test Details</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slateui-600">Client Name:</span>
                      <span className="text-ink-900">{inviteData.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slateui-600">Email:</span>
                      <span className="text-ink-900">{inviteData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slateui-600">Expires:</span>
                      <span className="text-ink-900">
                        {new Date(inviteData.expiresAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slateui-200 bg-paper-50 p-4">
                  <h3 className="font-semibold text-ink-900 mb-2">How to Test</h3>
                  <ol className="space-y-2 text-sm text-slateui-600 list-decimal list-inside">
                    <li>
                      Visit the{" "}
                      <Link
                        href="/client/invite-code"
                        className="text-gold-600 hover:text-gold-700 underline"
                      >
                        Client Invitation Code page
                      </Link>
                    </li>
                    <li>Enter the invitation code: <code className="bg-paper-100 px-1 rounded font-mono">{inviteData.token}</code></li>
                    <li>Or directly visit: <Link href={inviteData.inviteUrl} className="text-gold-600 hover:text-gold-700 underline">{inviteData.inviteUrl}</Link></li>
                    <li>Follow the prompts to sign in/up and upload a policy</li>
                  </ol>
                </div>
              </div>

              <div className="pt-4 border-t border-slateui-200">
                <Button
                  onClick={createTestInvite}
                  className="btn-secondary w-full"
                >
                  Create Another Test Invite
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

