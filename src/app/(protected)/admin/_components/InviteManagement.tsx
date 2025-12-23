"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, Copy, Check, Search, Plus, AlertCircle } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";

interface Invite {
  id: string;
  token: string;
  clientId: string;
  clientName: string;
  email: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  isArchived: boolean;
  isExpired: boolean;
}

export function InviteManagement() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reactivating, setReactivating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state for generating new invites
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    sendEmail: true,
  });

  useEffect(() => {
    loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, showArchived]);

  async function loadInvites() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (showArchived) params.set("archived", "true");
      params.set("limit", "100");

      const res = await fetch(`/api/admin/invites?${params}`);
      if (!res.ok) throw new Error("Failed to load invites");

      const data = await res.json();
      setInvites(data.invites || []);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }

  async function generateInvite() {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      showError("Email, first name, and last name are required");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/admin/invites/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate invite");
      }

      const data = await res.json();
      showSuccess(`Invite generated successfully! Code: ${data.invite.token}`);
      
      // Reset form and reload invites
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        dateOfBirth: "",
        sendEmail: true,
      });
      setShowGenerateForm(false);
      loadInvites();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to generate invite");
    } finally {
      setGenerating(false);
    }
  }

  async function reactivateInvite(token: string) {
    setReactivating(token);
    try {
      const res = await fetch("/api/admin/invites/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, extendDays: 14 }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reactivate invite");
      }

      showSuccess("Invite reactivated successfully");
      loadInvites();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to reactivate invite");
    } finally {
      setReactivating(null);
    }
  }

  function copyToClipboard(text: string, token: string) {
    navigator.clipboard.writeText(text);
    setCopied(token);
    showSuccess("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const activeInvites = invites.filter((inv) => !inv.isArchived && !inv.isExpired);
  const archivedInvites = invites.filter((inv) => inv.isArchived);
  const expiredInvites = invites.filter((inv) => inv.isExpired && !inv.isArchived);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink-900">Invite Management</h2>
          <p className="text-sm text-slateui-600 mt-1">
            Generate, view, and manage client invitation codes for new policyholders
          </p>
        </div>
        <Button
          onClick={() => setShowGenerateForm(!showGenerateForm)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Generate New Invite
        </Button>
      </div>

      {/* Generate Form */}
      {showGenerateForm && (
        <div className="card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-ink-900">Generate New Invite Code</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label mb-1 block">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="client@example.com"
                required
              />
            </div>
            <div>
              <label className="label mb-1 block">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input"
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className="label mb-1 block">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input"
                placeholder="Doe"
                required
              />
            </div>
            <div>
              <label className="label mb-1 block">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="label mb-1 block">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="input"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="sendEmail"
                checked={formData.sendEmail}
                onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="sendEmail" className="text-sm text-slateui-600">
                Send invitation email
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={generateInvite}
              disabled={generating || !formData.email || !formData.firstName || !formData.lastName}
              className="btn-primary"
            >
              {generating ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Generate Invite Code
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setShowGenerateForm(false);
                setFormData({
                  email: "",
                  firstName: "",
                  lastName: "",
                  phone: "",
                  dateOfBirth: "",
                  sendEmail: true,
                });
              }}
              className="btn-secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slateui-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by token, email, or client name..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showArchived"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showArchived" className="text-sm text-slateui-600">
              Show archived
            </label>
          </div>
        </div>
      </div>

      {/* Invites List */}
      {loading ? (
        <div className="card p-8 text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
          <p className="mt-4 text-sm text-slateui-600">Loading invites...</p>
        </div>
      ) : invites.length === 0 ? (
        <div className="card p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-slateui-400 mb-4" />
          <p className="text-slateui-600">No invites found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slateui-50 border-b border-slateui-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Token</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slateui-200">
                {invites.map((invite) => {
                  const inviteUrl = `${baseUrl}/invite/${invite.token}`;
                  const isUsed = invite.isArchived;
                  const isExpired = invite.isExpired;

                  return (
                    <tr key={invite.id} className="hover:bg-slateui-50">
                      <td className="px-4 py-3 text-sm text-ink-900">{invite.clientName}</td>
                      <td className="px-4 py-3 text-sm text-slateui-600">{invite.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-slateui-100 px-2 py-1 rounded">
                            {invite.token.substring(0, 16)}...
                          </code>
                          <button
                            onClick={() => copyToClipboard(invite.token, invite.token)}
                            className="text-slateui-400 hover:text-ink-900"
                            title="Copy token"
                          >
                            {copied === invite.token ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isUsed ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Used
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slateui-600">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(inviteUrl, `url-${invite.token}`)}
                            className="text-xs text-gold-600 hover:text-gold-700"
                            title="Copy invite URL"
                          >
                            {copied === `url-${invite.token}` ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          {isUsed && (
                            <button
                              onClick={() => reactivateInvite(invite.token)}
                              disabled={reactivating === invite.token}
                              className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                              title="Reactivate invite"
                            >
                              {reactivating === invite.token ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm text-slateui-600">Active Invites</div>
          <div className="text-2xl font-semibold text-ink-900 mt-1">{activeInvites.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slateui-600">Used/Archived</div>
          <div className="text-2xl font-semibold text-ink-900 mt-1">{archivedInvites.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slateui-600">Expired</div>
          <div className="text-2xl font-semibold text-ink-900 mt-1">{expiredInvites.length}</div>
        </div>
      </div>
    </div>
  );
}

