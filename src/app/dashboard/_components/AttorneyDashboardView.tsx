"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  Eye,
  Flag,
  Download,
  Building2,
  User,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Policy {
  id: string;
  policyNumber: string | null;
  policyType: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "DISCREPANCY" | "INCOMPLETE" | "REJECTED";
  updatedAt: Date;
  createdAt: Date;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  insurer: {
    id: string;
    name: string;
  } | null;
  carrierNameRaw?: string | null;
  documentCount: number;
}

interface Stats {
  totalPolicies: number;
  pendingVerification: number;
  verified: number;
  discrepancy: number;
  totalClients: number;
}

interface AttorneyDashboardViewProps {
  policies: Policy[];
  stats: Stats;
}

export function AttorneyDashboardView({ policies, stats }: AttorneyDashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const getStatusIcon = (status: Policy["verificationStatus"]) => {
    switch (status) {
      case "VERIFIED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "DISCREPANCY":
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case "INCOMPLETE":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "REJECTED":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-slateui-400" />;
    }
  };

  const getStatusColor = (status: Policy["verificationStatus"]) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-50 border-green-200 text-green-900";
      case "DISCREPANCY":
        return "bg-amber-50 border-amber-200 text-amber-900";
      case "INCOMPLETE":
        return "bg-blue-50 border-blue-200 text-blue-900";
      case "REJECTED":
        return "bg-red-50 border-red-200 text-red-900";
      default:
        return "bg-slateui-50 border-slateui-200 text-slateui-700";
    }
  };

  // Filter policies
  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch =
      !searchQuery ||
      policy.client.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.client.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (policy.policyNumber && policy.policyNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (policy.insurer?.name && policy.insurer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((policy as any).carrierNameRaw && (policy as any).carrierNameRaw.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = !statusFilter || policy.verificationStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Attorney Dashboard</h1>
          <p className="text-slateui-600 mt-1">
            Real-time overview of all policy records and registries
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/policy-locator">
            <Button variant="outline" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </Link>
          <Link href="/dashboard/clients/new">
            <Button className="btn-primary flex items-center gap-2">
              <User className="h-4 w-4" />
              New Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slateui-600">Total Policies</p>
              <p className="text-2xl font-bold text-ink-900">{stats.totalPolicies}</p>
            </div>
            <FileText className="h-8 w-8 text-gold-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slateui-600">Verified</p>
              <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slateui-600">Pending</p>
              <p className="text-2xl font-bold text-blue-600">{stats.pendingVerification}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slateui-600">Discrepancies</p>
              <p className="text-2xl font-bold text-amber-600">{stats.discrepancy}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slateui-600">Total Clients</p>
              <p className="text-2xl font-bold text-ink-900">{stats.totalClients}</p>
            </div>
            <User className="h-8 w-8 text-gold-500" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slateui-400" />
            <Input
              type="text"
              placeholder="Search by client name, email, policy number, or carrier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter || ""}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="input"
              aria-label="Filter by verification status"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="DISCREPANCY">Discrepancy</option>
              <option value="INCOMPLETE">Incomplete</option>
              <option value="REJECTED">Rejected</option>
            </select>
            {statusFilter && (
              <Button
                variant="outline"
                onClick={() => setStatusFilter(null)}
                className="px-3"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Policies Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slateui-50 border-b border-slateui-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slateui-700 uppercase tracking-wider">
                  Client / Decedent
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slateui-700 uppercase tracking-wider">
                  Policy
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slateui-700 uppercase tracking-wider">
                  Carrier
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slateui-700 uppercase tracking-wider">
                  Verification Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slateui-700 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slateui-700 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slateui-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slateui-200">
              {filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slateui-600">
                    {searchQuery || statusFilter
                      ? "No policies match your search criteria"
                      : "No policies found"}
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slateui-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slateui-400" />
                        <div>
                          <p className="text-sm font-medium text-ink-900">
                            {policy.client.firstName} {policy.client.lastName}
                          </p>
                          <p className="text-xs text-slateui-600">{policy.client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-ink-900">
                          {policy.policyNumber || "N/A"}
                        </p>
                        {policy.policyType && (
                          <p className="text-xs text-slateui-600">{policy.policyType}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slateui-400" />
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-ink-900">
                            {policy.insurer?.name ?? (policy as any).carrierNameRaw ?? "Unknown"}
                          </p>
                          {!policy.insurer?.name && (policy as any).carrierNameRaw && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                              Unresolved
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(policy.verificationStatus)}`}>
                        {getStatusIcon(policy.verificationStatus)}
                        <span>{policy.verificationStatus}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-slateui-600">
                        <FileText className="h-4 w-4" />
                        <span>{policy.documentCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slateui-600">
                        {new Date(policy.updatedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slateui-500">
                        {new Date(policy.updatedAt).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/dashboard/policies/${policy.id}/registry`}>
                          <Button variant="outline" size="sm" className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        </Link>
                        {policy.verificationStatus === "PENDING" && (
                          <Link href={`/dashboard/policies/${policy.id}/verification`}>
                            <Button variant="outline" size="sm" className="flex items-center gap-1 border-amber-300 text-amber-700 hover:bg-amber-50">
                              <Flag className="h-3 w-3" />
                              Verify
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6 bg-gold-50 border-gold-200">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/policy-locator">
            <div className="p-4 bg-white rounded-lg border border-gold-200 hover:border-gold-300 transition cursor-pointer">
              <Search className="h-6 w-6 text-gold-600 mb-2" />
              <h3 className="font-semibold text-ink-900 mb-1">Policy Locator</h3>
              <p className="text-sm text-slateui-600">
                Search across all policies and clients
              </p>
            </div>
          </Link>
          <Link href="/dashboard/clients">
            <div className="p-4 bg-white rounded-lg border border-gold-200 hover:border-gold-300 transition cursor-pointer">
              <User className="h-6 w-6 text-gold-600 mb-2" />
              <h3 className="font-semibold text-ink-900 mb-1">Manage Clients</h3>
              <p className="text-sm text-slateui-600">
                View and manage all client records
              </p>
            </div>
          </Link>
          <Link href="/dashboard/admin/compliance">
            <div className="p-4 bg-white rounded-lg border border-gold-200 hover:border-gold-300 transition cursor-pointer">
              <Flag className="h-6 w-6 text-gold-600 mb-2" />
              <h3 className="font-semibold text-ink-900 mb-1">Compliance</h3>
              <p className="text-sm text-slateui-600">
                System governance and compliance tools
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

