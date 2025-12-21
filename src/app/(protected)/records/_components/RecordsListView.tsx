"use client";

import { type User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, Clock, CheckCircle, AlertCircle, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface RegistrySummary {
  id: string;
  decedentName: string;
  status: string;
  createdAt: Date;
  latestVersion: {
    id: string;
    createdAt: Date;
    submittedBy: string;
  } | null;
  versionCount: number;
  lastUpdated: Date | null;
}

interface RecordsListViewProps {
  registries: RegistrySummary[];
  user: User;
}

type StatusFilter = "ALL" | "PENDING_VERIFICATION" | "VERIFIED" | "DISPUTED" | "ARCHIVED" | "ACTIVE";

export function RecordsListView({ registries, user }: RecordsListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Filter registries by search query and status
  const filteredRegistries = registries.filter((registry) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        registry.decedentName.toLowerCase().includes(query) ||
        registry.status.toLowerCase().includes(query) ||
        registry.id.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== "ALL" && registry.status !== statusFilter) {
      return false;
    }

    return true;
  });

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-100 text-green-800";
      case "PENDING_VERIFICATION":
        return "bg-yellow-100 text-yellow-800";
      case "DISPUTED":
        return "bg-red-100 text-red-800";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800";
      case "ACTIVE":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <CheckCircle className="h-4 w-4" />;
      case "PENDING_VERIFICATION":
        return <Clock className="h-4 w-4" />;
      case "DISPUTED":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Get status counts
  const statusCounts = {
    ALL: registries.length,
    PENDING_VERIFICATION: registries.filter((r) => r.status === "PENDING_VERIFICATION").length,
    VERIFIED: registries.filter((r) => r.status === "VERIFIED").length,
    DISPUTED: registries.filter((r) => r.status === "DISPUTED").length,
    ARCHIVED: registries.filter((r) => r.status === "ARCHIVED").length,
    ACTIVE: registries.filter((r) => r.status === "ACTIVE").length,
  };

  return (
    <div className="min-h-screen bg-paper-50 py-6">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
            Registry Records
          </h1>
          <p className="text-slateui-600">
            View and manage all registry records
          </p>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slateui-400" />
              <Input
                type="text"
                placeholder="Search by decedent name, status, or registry ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-slateui-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="flex-1 rounded-md border border-slateui-200 bg-white px-3 py-2 text-sm focus:border-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
                aria-label="Filter by status"
              >
                <option value="ALL">All Statuses ({statusCounts.ALL})</option>
                <option value="PENDING_VERIFICATION">
                  Pending Verification ({statusCounts.PENDING_VERIFICATION})
                </option>
                <option value="VERIFIED">Verified ({statusCounts.VERIFIED})</option>
                <option value="DISPUTED">Disputed ({statusCounts.DISPUTED})</option>
                <option value="ARCHIVED">Archived ({statusCounts.ARCHIVED})</option>
                <option value="ACTIVE">Active ({statusCounts.ACTIVE})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Registries Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slateui-50 border-b border-slateui-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Decedent Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Versions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slateui-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slateui-200">
                {filteredRegistries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slateui-500">
                      {searchQuery || statusFilter !== "ALL"
                        ? "No registries found matching your filters."
                        : "No registries found."}
                    </td>
                  </tr>
                ) : (
                  filteredRegistries.map((registry) => (
                    <tr key={registry.id} className="hover:bg-slateui-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-ink-900">{registry.decedentName}</div>
                        <div className="text-sm text-slateui-500 font-mono">{registry.id.substring(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(registry.status)}`}
                        >
                          {getStatusIcon(registry.status)}
                          {registry.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600">
                        {registry.versionCount} version{registry.versionCount !== 1 ? "s" : ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600">
                        {registry.lastUpdated
                          ? new Date(registry.lastUpdated).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600">
                        {new Date(registry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/records/${registry.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-slateui-600 text-center">
          Showing {filteredRegistries.length} of {registries.length} registries
        </div>
      </div>
    </div>
  );
}

