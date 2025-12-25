"use client";

import { useState, useEffect } from "react";
import { Search, Archive, Key, Calendar, User, Mail, Phone, AlertCircle } from "lucide-react";

type Invite = {
  id: string,
  token: string,
  clientId: string,
  clientName: string,
  email: string,
  phone: string | null;
  expiresAt: string,
  usedAt: string | null;
  createdAt: string,
  isArchived: boolean;
  isExpired: boolean;
};

export default function AdminInvitesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const searchInvites = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        archived: showArchived.toString(),
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const res = await fetch(`/api/admin/invites?${params}`);
      if (!res.ok) throw new Error("Failed to search invites");
      
      const data = await res.json();
      setInvites(data.invites || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error searching invites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchInvites();
  }, [showArchived, offset]);

  const handleArchive = async (token: string) => {
    if (!confirm("Are you sure you want to archive this invitation code?")) return;

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) throw new Error("Failed to archive invite");
      
      // Refresh the list
      searchInvites();
    } catch (error) {
      console.error("Error archiving invite:", error);
      alert("Failed to archive invite");
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-ink-900">Invitation Code Management</h1>
            <p className="mt-2 text-slateui-600">Search and archive invitation codes by admins</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slateui-400" />
              <input
                type="text"
                placeholder="Search by token, client name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchInvites()}
                className="w-full pl-10 pr-4 py-2 border border-slateui-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <button
              onClick={searchInvites}
              className="btn-primary px-6 py-2"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
            <label className="flex items-center gap-2 px-4 py-2 border border-slateui-200 rounded-lg cursor-pointer hover:bg-slateui-50">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => {
                  setShowArchived(e.target.checked);
                  setOffset(0);
                }}
                className="rounded"
              />
              <span className="text-sm text-slateui-700">Show Archived</span>
            </label>
          </div>
        </div>

        {/* Results */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-ink-900">
              Invitation Codes ({total})
            </h2>
          </div>

          {invites.length === 0 ? (
            <div className="text-center py-12 text-slateui-600">
              {loading ? "Loading..." : "No invitation codes found"}
            </div>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="border border-slateui-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Key className="h-5 w-5 text-gold-600" />
                        <div>
                          <div className="font-mono font-semibold text-ink-900">{invite.token}</div>
                        </div>
                        {invite.isArchived && (
                          <span className="px-2 py-1 text-xs bg-slateui-100 text-slateui-700 rounded">
                            Archived
                          </span>
                        )}
                        {invite.isExpired && !invite.isArchived && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Expired
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-slateui-400" />
                          <span className="text-slateui-700">{invite.clientName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-slateui-400" />
                          <span className="text-slateui-700">{invite.email}</span>
                        </div>
                        {invite.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-slateui-400" />
                            <span className="text-slateui-700">{invite.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-slateui-400" />
                          <span className="text-slateui-700">
                            Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-slateui-400" />
                          <span className="text-slateui-700">
                            Created: {new Date(invite.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {!invite.isArchived && (
                        <button
                          onClick={() => handleArchive(invite.token)}
                          className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
                        >
                          <Archive className="h-4 w-4" />
                          Archive
                        </button>
                      )}
                      <a
                        href={`/invite/${invite.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        View
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slateui-200">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="btn-secondary px-4 py-2 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slateui-600">
                Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="btn-secondary px-4 py-2 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
  );
}

