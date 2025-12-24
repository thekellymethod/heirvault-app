"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Key, Trash2, RotateCw, X, Check, AlertCircle } from "lucide-react";

type Token = {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  lastUsedPath: string | null;
  createdBy: {
    id: string;
    email: string;
  };
};

const SCOPE_PRESETS = [
  "console:read",
  "console:exec",
  "admin",
  "registry:read",
  "registry:write",
  "attorney:verify",
  "logs:read",
];

export default function TokensClient() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [newTokenName, setNewTokenName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [tokenStored, setTokenStored] = useState(false);
  const [rotatedToken, setRotatedToken] = useState<string | null>(null);
  const [rotatedTokenId, setRotatedTokenId] = useState<string | null>(null);
  const [rotateWarning, setRotateWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTokens();
  }, []);

  async function loadTokens() {
    try {
      const res = await fetch("/api/admin/tokens");
      const json = await res.json();
      if (json.ok) {
        setTokens(json.data);
      } else {
        setError(json.error || "Failed to load tokens");
      }
    } catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Unknown error";
} {
      setError(e.message || "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newTokenName.trim()) {
      setError("Token name is required");
      return;
    }
    if (selectedScopes.length === 0) {
      setError("At least one scope is required");
      return;
    }

    setError(null);
    try {
      const res = await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTokenName,
          scopes: selectedScopes,
          expiresInDays: expiresInDays || undefined,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setNewToken(json.data.token);
        setTokenStored(false);
        await loadTokens();
      } else {
        setError(json.error || "Failed to create token");
      }
    } catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Unknown error";
} {
      setError(e.message || "Failed to create token");
    }
  }

  async function handleRotate(tokenId: string) {
    setError(null);
    setRotateWarning(null);
    try {
      const res = await fetch(`/api/admin/tokens/${tokenId}/rotate`, {
        method: "POST",
      });

      const json = await res.json();
      if (json.ok) {
        setRotatedToken(json.data.token);
        setRotatedTokenId(json.data.newToken.id);
        setRotateWarning(json.data.warning || null);
        setTokenStored(false);
        await loadTokens();
      } else {
        setError(json.error || "Failed to rotate token");
      }
    } catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Unknown error";
} {
      setError(e.message || "Failed to rotate token");
    }
  }

  async function handleRevoke(tokenId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/tokens/${tokenId}/revoke`, {
        method: "POST",
      });

      const json = await res.json();
      if (json.ok) {
        setShowRevokeConfirm(null);
        await loadTokens();
      } else {
        setError(json.error || "Failed to revoke token");
      }
    } catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Unknown error";
} {
      setError(e.message || "Failed to revoke token");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function toggleScope(scope: string) {
    setSelectedScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  }

  function isExpired(token: Token) {
    if (!token.expiresAt) return false;
    return new Date(token.expiresAt) < new Date();
  }

  function isRevoked(token: Token) {
    return !!token.revokedAt;
  }

  if (loading) {
    return <div className="text-center py-8 text-slateui-600">Loading tokens...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-ink-900">All Tokens</h2>
        <Button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Key className="h-4 w-4 mr-2" />
          Create Token
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-paper-100 border-b border-slateui-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-ink-900">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-ink-900">Scopes</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-ink-900">Created</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-ink-900">Last Used</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-ink-900">Expires</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-ink-900">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-ink-900">Created By</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-ink-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slateui-200">
            {tokens.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slateui-600">
                  No tokens found. Create one to get started.
                </td>
              </tr>
            ) : (
              tokens.map((token) => (
                <tr key={token.id} className="hover:bg-paper-50">
                  <td className="px-4 py-3 text-sm text-ink-900">{token.name}</td>
                  <td className="px-4 py-3 text-sm text-ink-900">
                    <div className="flex flex-wrap gap-1">
                      {token.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="inline-block px-2 py-0.5 bg-slateui-100 text-slateui-700 rounded text-xs"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slateui-600">{formatDate(token.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-slateui-600">
                    {token.lastUsedAt ? (
                      <div>
                        <div>{formatDate(token.lastUsedAt)}</div>
                        {token.lastUsedPath && (
                          <div className="text-xs text-slateui-500 mt-0.5">{token.lastUsedPath}</div>
                        )}
                        {token.lastUsedIp && (
                          <div className="text-xs text-slateui-500">{token.lastUsedIp}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slateui-400 italic">Never</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slateui-600">{formatDate(token.expiresAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    {isRevoked(token) ? (
                      <span className="text-red-600 font-medium">Revoked</span>
                    ) : isExpired(token) ? (
                      <span className="text-orange-600 font-medium">Expired</span>
                    ) : (
                      <span className="text-green-600 font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slateui-600">{token.createdBy.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      {!isRevoked(token) && (
                        <>
                          <button
                            onClick={() => setShowRotateModal(token.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Rotate token"
                          >
                            <RotateCw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowRevokeConfirm(token.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Revoke token"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Token Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slateui-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-ink-900">Create API Token</h3>
                <button
                  onClick={() => {
                    setNewToken(null);
                    setNewTokenName("");
                    setSelectedScopes([]);
                    setExpiresInDays(undefined);
                    setShowCreateModal(false);
                    setTokenStored(false);
                  }}
                  className="text-slateui-500 hover:text-ink-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {newToken ? (
              <div className="p-6">
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm font-medium text-ink-900 mb-2">⚠️ Store this token securely</p>
                  <p className="text-sm text-slateui-600 mb-4">
                    This is the only time you'll see this token in plaintext. Copy it now and store it securely.
                  </p>
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newToken}
                      readOnly
                      className="font-mono text-sm"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button onClick={() => copyToClipboard(newToken)} variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tokenStored}
                      onChange={(e) => setTokenStored(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-ink-900">I have stored this token securely</span>
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setNewToken(null);
                      setNewTokenName("");
                      setSelectedScopes([]);
                      setExpiresInDays(undefined);
                      setShowCreateModal(false);
                      setTokenStored(false);
                    }}
                    variant="outline"
                    disabled={!tokenStored}
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-ink-900 mb-1">Token Name</label>
                  <Input
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="e.g., Production API Token"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-ink-900 mb-2">Scopes</label>
                  <div className="space-y-2">
                    {SCOPE_PRESETS.map((scope) => (
                      <label key={scope} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope)}
                          onChange={() => toggleScope(scope)}
                          className="rounded"
                        />
                        <span className="text-sm text-ink-900">{scope}</span>
                      </label>
                    ))}
                  </div>
                  {selectedScopes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedScopes.map((scope) => (
                        <span
                          key={scope}
                          className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-ink-900 mb-1">
                    Expires In (days, optional)
                  </label>
                  <Input
                    type="number"
                    value={expiresInDays || ""}
                    onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Leave empty for no expiry"
                    min="1"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setNewToken(null);
                      setNewTokenName("");
                      setSelectedScopes([]);
                      setExpiresInDays(undefined);
                      setShowCreateModal(false);
                      setTokenStored(false);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} className="btn-primary" disabled={!newTokenName || selectedScopes.length === 0}>
                    Create Token
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rotate Token Modal */}
      {showRotateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-slateui-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-ink-900">Rotate Token</h3>
                <button
                  onClick={() => {
                    setRotatedToken(null);
                    setRotatedTokenId(null);
                    setRotateWarning(null);
                    setShowRotateModal(null);
                    setTokenStored(false);
                  }}
                  className="text-slateui-500 hover:text-ink-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {rotatedToken ? (
              <div className="p-6">
                {rotateWarning && (
                  <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
                    <p className="text-sm font-medium text-ink-900 mb-1">ℹ️ Note</p>
                    <p className="text-sm text-slateui-600">{rotateWarning}</p>
                  </div>
                )}
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm font-medium text-ink-900 mb-2">⚠️ Store this new token securely</p>
                  <p className="text-sm text-slateui-600 mb-4">
                    This is the only time you'll see this token in plaintext. The old token remains active until you revoke it.
                  </p>
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={rotatedToken}
                      readOnly
                      className="font-mono text-sm"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button onClick={() => copyToClipboard(rotatedToken)} variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tokenStored}
                      onChange={(e) => setTokenStored(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-ink-900">I have stored this token securely</span>
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setRotatedToken(null);
                      setRotatedTokenId(null);
                      setRotateWarning(null);
                      setShowRotateModal(null);
                      setTokenStored(false);
                    }}
                    variant="outline"
                    disabled={!tokenStored}
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {showRotateModal && (() => {
                  const tokenToRotate = tokens.find((t) => t.id === showRotateModal);
                  const isExpiredToken = tokenToRotate && isExpired(tokenToRotate);
                  return isExpiredToken ? (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <p className="text-sm font-medium text-ink-900 mb-1">ℹ️ Expired Token</p>
                      <p className="text-sm text-slateui-600">
                        This token is expired. The new token will have no expiry date.
                      </p>
                    </div>
                  ) : null;
                })()}
                <p className="text-sm text-slateui-600 mb-4">
                  This will create a new token with the same scopes. The old token will remain active until you revoke it.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setRotatedToken(null);
                      setRotatedTokenId(null);
                      setRotateWarning(null);
                      setShowRotateModal(null);
                      setTokenStored(false);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleRotate(showRotateModal)} className="btn-primary">
                    Rotate Token
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="mb-4">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-ink-900 text-center mb-2">Revoke Token?</h3>
                <p className="text-sm text-slateui-600 text-center">
                  This action cannot be undone. The token will immediately stop working.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setShowRevokeConfirm(null)} variant="outline">
                  Cancel
                </Button>
                <Button onClick={() => handleRevoke(showRevokeConfirm)} className="btn-primary" style={{ backgroundColor: "#dc2626" }}>
                  Revoke Token
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

