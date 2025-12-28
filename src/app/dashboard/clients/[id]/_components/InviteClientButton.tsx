"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Copy, Check, ExternalLink } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { useRegistryGate } from "@/hooks/useRegistryGate";
import { fetchJson } from "@/lib/http/fetchJson";

interface Props {
  clientId: string,
  defaultEmail: string,
  clientName: string,
}

export function InviteClientButton({ clientId, defaultEmail, clientName }: Props) {
  const { ready, active, gate } = useRegistryGate();
  const [email, setEmail] = useState(defaultEmail || "");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleInvite() {
    // Soft gate check
    if (!gate()) return;

    setError(null);
    setSuccess(false);
    setInviteUrl(null);
    setInviteCode(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      // Use unified fetchJson which handles 402 automatically
      const data = await fetchJson(`/api/attorney/clients/${clientId}/invite/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Note: The invite/send endpoint returns different structure
      // Adjust based on your actual API response
      if (data.inviteUrl) {
        setInviteUrl(data.inviteUrl);
        const code = data.inviteUrl.split("/invite/")[1];
        setInviteCode(code);
        setSuccess(true);
        showSuccess(`Invitation sent successfully to ${email}`);
      } else {
        // Fallback for different API structure
        showSuccess(`Invitation sent successfully to ${email}`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showSuccess("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (inviteUrl && success) {
    return (
      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-900 mb-2">
              Invitation Sent Successfully!
            </h3>
            <p className="text-sm text-slateui-600">
              An invitation has been sent to <span className="font-medium text-ink-900">{email}</span>
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowForm(false);
              setInviteUrl(null);
              setInviteCode(null);
              setSuccess(false);
              setError(null);
            }}
            className="btn-secondary"
          >
            Close
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="invite-url" className="label mb-1 block">Invitation Link</label>
            <div className="flex gap-2">
              <input
                id="invite-url"
                type="text"
                readOnly
                value={inviteUrl}
                className="input flex-1 font-mono text-sm"
                aria-label="Invitation link"
              />
              <Button
                onClick={() => copyToClipboard(inviteUrl)}
                className="btn-secondary"
                title="Copy link"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                onClick={() => window.open(inviteUrl, "_blank")}
                className="btn-secondary"
                title="Open link"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {inviteCode && (
            <div>
              <label htmlFor="invite-code" className="label mb-1 block">Invitation Code</label>
              <div className="flex gap-2">
                <input
                  id="invite-code"
                  type="text"
                  readOnly
                  value={inviteCode}
                  className="input flex-1 font-mono text-sm font-semibold text-gold-700"
                  aria-label="Invitation code"
                />
                <Button
                  onClick={() => copyToClipboard(inviteCode)}
                  className="btn-secondary"
                  title="Copy code"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-slateui-500 mt-1">
                Client can use this code at <code className="bg-paper-100 px-1 rounded">/client/invite-code</code>
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slateui-200">
            <Button
              onClick={() => {
                setShowForm(true);
                setInviteUrl(null);
                setInviteCode(null);
                setSuccess(false);
                setEmail(defaultEmail || "");
              }}
              className="btn-primary w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Another Invitation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!showForm) {
    const handleClick = () => {
      if (!isActive) {
        window.location.href = "/dashboard/billing";
        return;
      }
      setShowForm(true);
    };

    return (
      <Button
        onClick={handleClick}
        className="btn-primary"
        disabled={billingLoading}
        title={!isActive ? "Activate billing to send secure upload invites" : ""}
      >
        <Mail className="h-4 w-4 mr-2" />
        Send Client Invitation
      </Button>
    );
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-900 mb-2">
            Send Client Invitation
          </h3>
          <p className="text-sm text-slateui-600">
            Send an invitation code or link to <span className="font-medium text-ink-900">{clientName}</span> to complete their registry.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setShowForm(false);
            setError(null);
            setEmail(defaultEmail || "");
          }}
          className="btn-secondary"
        >
          Cancel
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="label mb-1 block">
            Client Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="input"
            required
          />
          <p className="text-xs text-slateui-500 mt-1">
            The invitation will be sent to this email address.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleInvite}
            disabled={loading || !email || !email.includes("@")}
            className="btn-primary flex-1"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
