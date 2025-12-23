"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Search, Archive, Eye, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";

interface Receipt {
  id: string;
  receiptId: string;
  token: string;
  clientId: string;
  clientName: string;
  email: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  isArchived: boolean;
}

export function ReceiptManagement() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, showArchived, offset]);

  async function loadReceipts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (showArchived) params.set("archived", "true");
      params.set("limit", limit.toString());
      params.set("offset", offset.toString());

      const res = await fetch(`/api/admin/receipts?${params}`);
      if (!res.ok) throw new Error("Failed to load receipts");

      const data = await res.json();
      setReceipts(data.receipts || []);
      setTotal(data.total || 0);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive(receiptId: string, token: string) {
    if (!confirm("Are you sure you want to archive this receipt?")) return;

    try {
      const res = await fetch("/api/admin/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptId, token }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to archive receipt");
      }

      showSuccess("Receipt archived successfully");
      loadReceipts();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to archive receipt");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink-900">Receipt Management</h2>
          <p className="text-sm text-slateui-600 mt-1">
            View and manage client receipts generated from policy submissions
          </p>
        </div>
        <Button
          onClick={() => window.open("/api/admin/samples/receipt-pdf", "_blank")}
          className="btn-secondary"
          title="View sample receipt PDF"
        >
          <FileText className="h-4 w-4 mr-2" />
          Sample Receipt
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slateui-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by receipt ID, token, email, or client name..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showArchivedReceipts"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showArchivedReceipts" className="text-sm text-slateui-600">
              Show archived
            </label>
          </div>
        </div>
      </div>

      {/* Receipts List */}
      {loading ? (
        <div className="card p-8 text-center">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
          <p className="mt-4 text-sm text-slateui-600">Loading receipts...</p>
        </div>
      ) : receipts.length === 0 ? (
        <div className="card p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-slateui-400 mb-4" />
          <p className="text-slateui-600">No receipts found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slateui-50 border-b border-slateui-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Receipt ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Token</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slateui-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slateui-200">
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-slateui-50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-sm font-semibold text-ink-900">{receipt.receiptId}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-900">{receipt.clientName}</td>
                    <td className="px-4 py-3 text-sm text-slateui-600">{receipt.email}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono bg-slateui-100 px-2 py-1 rounded">
                        {receipt.token.substring(0, 16)}...
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      {receipt.isArchived ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Archived
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slateui-600">
                      {new Date(receipt.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!receipt.isArchived && (
                          <button
                            onClick={() => handleArchive(receipt.receiptId, receipt.token)}
                            className="text-xs text-slateui-600 hover:text-ink-900"
                            title="Archive receipt"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/invite/${receipt.token}/receipt`)}
                          className="text-xs text-gold-600 hover:text-gold-700"
                          title="View receipt"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between pt-4 border-t border-slateui-200">
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

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="text-sm text-slateui-600">Total Receipts</div>
          <div className="text-2xl font-semibold text-ink-900 mt-1">{total}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slateui-600">Archived</div>
          <div className="text-2xl font-semibold text-ink-900 mt-1">
            {receipts.filter((r) => r.isArchived).length}
          </div>
        </div>
      </div>
    </div>
  );
}

