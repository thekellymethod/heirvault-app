"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, Plus, Trash2, ExternalLink } from "lucide-react";

interface TestInvite {
  token: string;
  email: string;
  clientName: string;
  url: string;
  expiresAt: string;
  clientId: string;
}

export default function TestInvitesPage() {
  const [invites, setInvites] = useState<TestInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [newInviteData, setNewInviteData] = useState({
    email: "test.client@example.com",
    firstName: "Test",
    lastName: "Client",
  });

  const generateTestInvite = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/test/create-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInviteData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invite");

      const invite: TestInvite = {
        token: data.token,
        email: data.email,
        clientName: data.clientName,
        url: data.url,
        expiresAt: data.expiresAt,
        clientId: data.clientId,
      };

      setInvites([...invites, invite]);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createMultipleTestInvites = async () => {
    setLoading(true);
    const testClients = [
      { email: "john.doe@test.com", firstName: "John", lastName: "Doe" },
      { email: "jane.smith@test.com", firstName: "Jane", lastName: "Smith" },
      { email: "robert.johnson@test.com", firstName: "Robert", lastName: "Johnson" },
      { email: "mary.williams@test.com", firstName: "Mary", lastName: "Williams" },
      { email: "david.brown@test.com", firstName: "David", lastName: "Brown" },
    ];

    try {
      const newInvites: TestInvite[] = [];
      for (const client of testClients) {
        const res = await fetch("/api/test/create-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(client),
        });

        const data = await res.json();
        if (res.ok) {
          newInvites.push({
            token: data.token,
            email: data.email,
            clientName: data.clientName,
            url: data.url,
            expiresAt: data.expiresAt,
            clientId: data.clientId,
          });
        }
      }
      setInvites([...invites, ...newInvites]);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, token: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const removeInvite = (token: string) => {
    setInvites(invites.filter((inv) => inv.token !== token));
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-paper-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
            Test Invitation Codes Generator
          </h1>
          <p className="text-slateui-600">
            Generate test invitation codes for testing the client invitation system
          </p>
        </div>

        {/* Create Single Invite */}
        <div className="card p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-ink-900 mb-4">
            Create Single Test Invite
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label mb-1 block text-sm">Email</label>
              <input
                type="email"
                value={newInviteData.email}
                onChange={(e) =>
                  setNewInviteData({ ...newInviteData, email: e.target.value })
                }
                className="input"
                placeholder="test@example.com"
              />
            </div>
            <div>
              <label className="label mb-1 block text-sm">First Name</label>
              <input
                type="text"
                value={newInviteData.firstName}
                onChange={(e) =>
                  setNewInviteData({ ...newInviteData, firstName: e.target.value })
                }
                className="input"
                placeholder="Test"
              />
            </div>
            <div>
              <label className="label mb-1 block text-sm">Last Name</label>
              <input
                type="text"
                value={newInviteData.lastName}
                onChange={(e) =>
                  setNewInviteData({ ...newInviteData, lastName: e.target.value })
                }
                className="input"
                placeholder="Client"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={generateTestInvite}
              disabled={loading}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Single Invite
            </Button>
            <Button
              onClick={createMultipleTestInvites}
              disabled={loading}
              className="btn-secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create 5 Test Invites
            </Button>
          </div>
        </div>

        {/* Invites List */}
        {invites.length > 0 && (
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-ink-900 mb-4">
              Generated Test Invites ({invites.length})
            </h2>
            <div className="space-y-4">
              {invites.map((invite, index) => (
                <div
                  key={invite.token}
                  className="border border-slateui-200 rounded-lg p-4 bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-ink-900">
                          Test Invite #{index + 1}
                        </span>
                        <span className="text-xs text-slateui-500 bg-slateui-100 px-2 py-1 rounded">
                          {invite.clientName}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-slateui-600">Email:</span>{" "}
                          <span className="font-mono text-ink-900">{invite.email}</span>
                        </div>
                        <div>
                          <span className="text-slateui-600">Token:</span>{" "}
                          <span className="font-mono text-ink-900 bg-slateui-50 px-2 py-1 rounded">
                            {invite.token}
                          </span>
                        </div>
                        <div>
                          <span className="text-slateui-600">Expires:</span>{" "}
                          <span className="text-ink-900">
                            {new Date(invite.expiresAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(invite.token, invite.token)}
                        className="text-slateui-600 hover:text-ink-900"
                      >
                        {copiedToken === invite.token ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const url = invite.url.startsWith("http") ? invite.url : `http://${invite.url}`;
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        className="text-slateui-600 hover:text-ink-900"
                        title="Open invitation URL"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeInvite(invite.token)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slateui-200">
                    <a
                      href={invite.url.startsWith("http") ? invite.url : `http://${invite.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gold-600 hover:text-gold-700 font-medium break-all"
                    >
                      {invite.url}
                    </a>
                    <p className="text-xs text-slateui-500 mt-1">
                      Click to open in new tab, or copy the URL above
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="card p-6 mt-6 bg-gold-50 border-gold-200">
          <h3 className="font-display text-lg font-semibold text-ink-900 mb-3">
            How to Use Test Invites
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slateui-700">
            <li>Click "Create Single Invite" or "Create 5 Test Invites" to generate test codes</li>
            <li>Copy the invitation token or click the URL to test the client invitation flow</li>
            <li>Visit the invitation URL to see the client portal form</li>
            <li>Test submitting policy information with the form</li>
            <li>Test the receipt generation and email functionality</li>
            <li>Test the update form and QR code scanning</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

