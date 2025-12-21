"use client";

import { useState } from "react";
import { type User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Filter,
  Download,
  Shield,
} from "lucide-react";

interface AccessLog {
  id: string;
  registryId: string;
  userId: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
  decedentName: string | null;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
}

interface AuditViewProps {
  logs: AccessLog[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  availableActions: string[];
  filters: {
    action: string;
    registryId: string;
    userId: string;
    startDate: string;
    endDate: string;
  };
  user: User;
}

/**
 * Audit View Component
 * 
 * Read-only display of audit logs
 * Filterable by action, registry, user, date range
 * Exportable (PDF later)
 */
export function AuditView({
  logs,
  totalCount,
  currentPage,
  pageSize,
  availableActions,
  filters: initialFilters,
}: AuditViewProps) {
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.registryId) params.set("registryId", filters.registryId);
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    params.set("page", "1"); // Reset to first page
    
    window.location.href = `/audit?${params.toString()}`;
  };

  const clearFilters = () => {
    window.location.href = "/audit";
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATED":
        return "bg-green-100 text-green-800";
      case "UPDATED":
        return "bg-blue-100 text-blue-800";
      case "VIEWED":
        return "bg-gray-100 text-gray-800";
      case "VERIFIED":
        return "bg-purple-100 text-purple-800";
      case "ARCHIVED":
        return "bg-yellow-100 text-yellow-800";
      case "EXPORTED":
        return "bg-orange-100 text-orange-800";
      case "DELETED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slateui-100 text-slateui-800";
    }
  };

  return (
    <div className="min-h-screen bg-paper-50 py-6">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
                Audit Trail
              </h1>
              <p className="text-slateui-600">
                Complete access log history. Read-only. This is where credibility lives.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                disabled
                title="PDF export coming soon"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="card p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink-900 mb-1">
                Immutable Audit Trail
              </p>
              <p className="text-sm text-slateui-600">
                All access logs are immutable and cannot be modified or deleted.
                This provides legal defensibility and compliance audit support.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="card p-6 mb-6">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
              Filter Logs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">
                  Action
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange("action", e.target.value)}
                  className="w-full px-3 py-2 border border-slateui-300 rounded-lg"
                  title="Filter by action type"
                >
                  <option value="">All Actions</option>
                  {availableActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">
                  Registry ID
                </label>
                <Input
                  type="text"
                  value={filters.registryId}
                  onChange={(e) => handleFilterChange("registryId", e.target.value)}
                  placeholder="Filter by registry ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">
                  User ID
                </label>
                <Input
                  type="text"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange("userId", e.target.value)}
                  placeholder="Filter by user ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
              <Button onClick={applyFilters} className="btn-primary">
                Apply Filters
              </Button>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-sm font-medium text-slateui-600 mb-1">Total Logs</div>
            <div className="text-2xl font-bold text-ink-900">{totalCount.toLocaleString()}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-slateui-600 mb-1">Showing</div>
            <div className="text-2xl font-bold text-ink-900">
              {logs.length} of {totalCount}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-slateui-600 mb-1">Page</div>
            <div className="text-2xl font-bold text-ink-900">
              {currentPage} of {totalPages}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm font-medium text-slateui-600 mb-1">Actions</div>
            <div className="text-2xl font-bold text-ink-900">{availableActions.length}</div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slateui-50 border-b border-slateui-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Registry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Metadata
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slateui-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slateui-500">
                      No audit logs found matching your filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slateui-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          {log.registryId !== "search" ? (
                            <Link
                              href={`/records/${log.registryId}`}
                              className="text-sm font-medium text-ink-900 hover:text-gold-600"
                            >
                              {log.decedentName || "Unknown"}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-ink-900">
                              Search Operation
                            </span>
                          )}
                          <div className="text-xs text-slateui-500 font-mono">
                            {log.registryId.substring(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600">
                        {log.userId ? (
                          <div>
                            <div>
                              {log.userFirstName && log.userLastName
                                ? `${log.userFirstName} ${log.userLastName}`
                                : log.userEmail || "Unknown User"}
                            </div>
                            <div className="text-xs text-slateui-500 font-mono">
                              {log.userId.substring(0, 8)}...
                            </div>
                          </div>
                        ) : (
                          <span className="text-slateui-400 italic">System</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slateui-600">
                        {log.metadata ? (
                          <details className="cursor-pointer">
                            <summary className="text-ink-900 hover:text-gold-600">
                              View Metadata
                            </summary>
                            <pre className="mt-2 p-2 bg-slateui-50 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-slateui-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slateui-200 flex items-center justify-between">
              <div className="text-sm text-slateui-600">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} logs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("page", String(currentPage - 1));
                    window.location.href = `/audit?${params.toString()}`;
                  }}
                >
                  Previous
                </Button>
                <span className="text-sm text-slateui-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("page", String(currentPage + 1));
                    window.location.href = `/audit?${params.toString()}`;
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

