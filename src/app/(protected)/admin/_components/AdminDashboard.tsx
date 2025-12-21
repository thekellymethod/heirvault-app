"use client";

import { useState, useEffect } from "react";
import { type User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Shield,
  UserCheck,
  FileText,
  CheckCircle,
  X,
  Clock,
  Search,
  AlertCircle,
  Users,
  Scale,
  Eye,
  Download,
} from "lucide-react";

interface AdminDashboardProps {
  admin: User;
}

interface AccessRequest {
  id: string;
  registryId: string;
  requestedByUserId: string;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedByUserId?: string;
  approvedAt?: string;
  reason?: string;
  decedentName?: string;
  requesterEmail?: string;
  requesterName?: string;
}

interface AttorneyCredential {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  barNumber: string | null;
  status: "verified" | "pending" | "revoked";
  lastVerified: string | null;
  createdAt: string;
}

/**
 * Admin Dashboard Component
 * 
 * Only admins
 * Approvals, credential reviews, compliance
 */
export function AdminDashboard({ admin }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "approvals" | "credentials" | "compliance">("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Access requests
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");

  // Attorney credentials
  const [attorneyCredentials, setAttorneyCredentials] = useState<AttorneyCredential[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === "approvals") {
        // Load access requests
        const statusParam = statusFilter === "ALL" ? "" : `?status=${statusFilter}`;
        const res = await fetch(`/api/access${statusParam}`);
        if (!res.ok) throw new Error("Failed to load access requests");
        const data = await res.json();
        setAccessRequests(data.requests || []);
      } else if (activeTab === "credentials") {
        // Load attorney credentials
        // TODO: Create API endpoint for attorney credentials
        // For now, placeholder
        setAttorneyCredentials([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string, action: "APPROVE" | "REJECT", reason?: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process request");
      }

      setSuccess(`Access request ${action === "APPROVE" ? "approved" : "rejected"}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = accessRequests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-paper-50 py-6">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
                Administration
              </h1>
              <p className="text-slateui-600">
                System governance, approvals, credential reviews, and compliance management.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/audit">
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Audit Trail
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="card p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink-900 mb-1">
                Admin-Only Access
              </p>
              <p className="text-sm text-slateui-600">
                This page is restricted to administrators only. All actions are logged for audit purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slateui-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-gold-500 text-gold-600"
                  : "border-transparent text-slateui-500 hover:text-slateui-700 hover:border-slateui-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("approvals")}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === "approvals"
                  ? "border-gold-500 text-gold-600"
                  : "border-transparent text-slateui-500 hover:text-slateui-700 hover:border-slateui-300"
              }`}
            >
              Access Approvals
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("credentials")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "credentials"
                  ? "border-gold-500 text-gold-600"
                  : "border-transparent text-slateui-500 hover:text-slateui-700 hover:border-slateui-300"
              }`}
            >
              Credential Reviews
            </button>
            <button
              onClick={() => setActiveTab("compliance")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "compliance"
                  ? "border-gold-500 text-gold-600"
                  : "border-transparent text-slateui-500 hover:text-slateui-700 hover:border-slateui-300"
              }`}
            >
              Compliance
            </button>
          </nav>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="card p-4 mb-6 bg-red-50 border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="card p-4 mb-6 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">{success}</span>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/audit">
                <div className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <Eye className="h-8 w-8 text-gold-600" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink-900 mb-2">
                    Audit Trail
                  </h3>
                  <p className="text-sm text-slateui-600">
                    View complete access logs and reconstruct "who did what when" for any record.
                  </p>
                </div>
              </Link>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <UserCheck className="h-8 w-8 text-blue-600" />
                  <span className="text-2xl font-bold text-ink-900">
                    {pendingCount}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-ink-900 mb-2">
                  Pending Approvals
                </h3>
                <p className="text-sm text-slateui-600">
                  Access requests awaiting review and approval.
                </p>
              </div>

              <Link href="/dashboard/admin/compliance">
                <div className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <Scale className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink-900 mb-2">
                    Compliance Dashboard
                  </h3>
                  <p className="text-sm text-slateui-600">
                    Full compliance management interface.
                  </p>
                </div>
              </Link>
            </div>

            <div className="card p-6">
              <h2 className="font-display text-xl font-semibold text-ink-900 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/audit?action=ACCESS_REQUESTED">
                  <Button variant="outline" className="w-full justify-start">
                    <Eye className="h-4 w-4 mr-2" />
                    View Access Requests in Audit Trail
                  </Button>
                </Link>
                <Link href="/audit?action=ACCESS_GRANTED">
                  <Button variant="outline" className="w-full justify-start">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    View Access Grants in Audit Trail
                  </Button>
                </Link>
                <Link href="/audit?action=SEARCH_PERFORMED">
                  <Button variant="outline" className="w-full justify-start">
                    <Search className="h-4 w-4 mr-2" />
                    View Search Operations
                  </Button>
                </Link>
                <Link href="/audit?action=REGISTRY_VIEW">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    View Registry Access Logs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === "approvals" && (
          <div className="space-y-6">
            {/* Filter */}
            <div className="card p-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-ink-900">Filter by Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="px-3 py-2 border border-slateui-300 rounded-lg"
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ALL">All</option>
                </select>
              </div>
            </div>

            {/* Access Requests Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slateui-50 border-b border-slateui-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                        Requested
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                        Requester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                        Registry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slateui-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slateui-500">
                          Loading...
                        </td>
                      </tr>
                    ) : accessRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slateui-500">
                          No access requests found.
                        </td>
                      </tr>
                    ) : (
                      accessRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-slateui-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600">
                            {new Date(request.requestedAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600">
                            <div>
                              <div>{request.requesterName || request.requesterEmail || "Unknown"}</div>
                              <div className="text-xs text-slateui-500 font-mono">
                                {request.requestedByUserId.substring(0, 8)}...
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <Link
                                href={`/records/${request.registryId}`}
                                className="text-sm font-medium text-ink-900 hover:text-gold-600"
                              >
                                {request.decedentName || "Unknown"}
                              </Link>
                              <div className="text-xs text-slateui-500 font-mono">
                                {request.registryId.substring(0, 8)}...
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slateui-600">
                            {request.reason || "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                request.status === "APPROVED"
                                  ? "bg-green-100 text-green-800"
                                  : request.status === "REJECTED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {request.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {request.status === "PENDING" && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-700 border-green-300 hover:bg-green-50"
                                  onClick={() => handleApproveRequest(request.id, "APPROVE")}
                                  disabled={loading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-700 border-red-300 hover:bg-red-50"
                                  onClick={() => {
                                    const reason = prompt("Reason for rejection:");
                                    if (reason !== null) {
                                      handleApproveRequest(request.id, "REJECT", reason);
                                    }
                                  }}
                                  disabled={loading}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                            {request.status !== "PENDING" && (
                              <div className="text-xs text-slateui-500">
                                {request.approvedAt
                                  ? `Processed ${new Date(request.approvedAt).toLocaleDateString()}`
                                  : "—"}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "credentials" && (
          <div className="card p-6">
            <div className="text-center py-12 text-slateui-500">
              <UserCheck className="h-12 w-12 mx-auto mb-4 text-slateui-400" />
              <p className="text-lg font-medium mb-2">Credential Reviews</p>
              <p className="text-sm">
                Attorney credential management will be implemented here.
              </p>
              <p className="text-xs mt-2">
                See <Link href="/dashboard/admin/compliance" className="text-gold-600 hover:underline">Compliance Dashboard</Link> for current credential management.
              </p>
            </div>
          </div>
        )}

        {activeTab === "compliance" && (
          <div className="card p-6">
            <div className="text-center py-12 text-slateui-500">
              <Scale className="h-12 w-12 mx-auto mb-4 text-slateui-400" />
              <p className="text-lg font-medium mb-2">Compliance Management</p>
              <p className="text-sm mb-4">
                Full compliance dashboard with rules, takedowns, and statutory alignment.
              </p>
              <Link href="/dashboard/admin/compliance">
                <Button className="btn-primary">
                  Open Compliance Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

