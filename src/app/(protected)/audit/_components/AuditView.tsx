"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Filter,
  Shield,
  Clock,
} from "lucide-react";

interface AccessLog {
  id: string;
  timestamp: Date;
  userId: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  registryId: string;
  metadata: Record<string, unknown> | null;
}

interface AuditViewProps {
  logs: AccessLog[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: {
    action: string;
    registryId: string;
    userId: string;
    startDate: string;
    endDate: string;
  };
}

/**
 * Audit View Component
 * 
 * Read-only display of audit logs
 * Displays table: time, user, action, registryId, metadata
 * Filterable by action, registry, user, date range
 * No edits. Read-only.
 */
export function AuditView({
  logs,
  totalCount,
  currentPage,
  pageSize,
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

  const formatMetadata = (metadata: Record<string, unknown> | null): string => {
    if (!metadata) return "—";
    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return String(metadata);
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
                Read-only access logs. All actions are logged for compliance and audit purposes.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="card p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink-900 mb-1">
                Read-Only Audit Logs
              </p>
              <p className="text-sm text-slateui-600">
                This page displays all access logs. Logs are immutable and cannot be edited or deleted.
                All actions are logged for legal defensibility and compliance.
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="filter-action" className="block text-sm font-medium text-ink-900 mb-1">
                  Action
                </label>
                <Input
                  id="filter-action"
                  type="text"
                  value={filters.action}
                  onChange={(e) => handleFilterChange("action", e.target.value)}
                  placeholder="e.g., REGISTRY_VIEW"
                />
              </div>
              <div>
                <label htmlFor="filter-registryId" className="block text-sm font-medium text-ink-900 mb-1">
                  Registry ID
                </label>
                <Input
                  id="filter-registryId"
                  type="text"
                  value={filters.registryId}
                  onChange={(e) => handleFilterChange("registryId", e.target.value)}
                  placeholder="Registry ID"
                />
              </div>
              <div>
                <label htmlFor="filter-userId" className="block text-sm font-medium text-ink-900 mb-1">
                  User ID
                </label>
                <Input
                  id="filter-userId"
                  type="text"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange("userId", e.target.value)}
                  placeholder="User ID"
                />
              </div>
              <div>
                <label htmlFor="filter-startDate" className="block text-sm font-medium text-ink-900 mb-1">
                  Start Date
                </label>
                <Input
                  id="filter-startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="filter-endDate" className="block text-sm font-medium text-ink-900 mb-1">
                  End Date
                </label>
                <Input
                  id="filter-endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
              <Button onClick={applyFilters} className="btn-primary">
                Apply Filters
              </Button>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-slateui-500" />
              <span className="text-sm text-slateui-600">
                Showing {logs.length} of {totalCount} log entries
              </span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slateui-600">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slateui-50 border-b border-slateui-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Registry ID
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600">
                        {log.userName || log.userEmail || (log.userId ? `User ${log.userId.substring(0, 8)}...` : "System")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600 font-mono">
                        {log.registryId === "system" ? (
                          <span className="text-slateui-400">System</span>
                        ) : (
                          <Link
                            href={`/records/${log.registryId}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {log.registryId.substring(0, 8)}...
                          </Link>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slateui-600">
                        <details className="cursor-pointer">
                          <summary className="text-blue-600 hover:text-blue-800">
                            View Metadata
                          </summary>
                          <pre className="mt-2 p-2 bg-slateui-50 rounded text-xs overflow-x-auto max-w-md">
                            {formatMetadata(log.metadata)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card p-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentPage > 1 && (
                  <Link href={`/audit?page=${currentPage - 1}`}>
                    <Button variant="outline">Previous</Button>
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link href={`/audit?page=${currentPage + 1}`}>
                    <Button variant="outline">Next</Button>
                  </Link>
                )}
              </div>
              <span className="text-sm text-slateui-600">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
