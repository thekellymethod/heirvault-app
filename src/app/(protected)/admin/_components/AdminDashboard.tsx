"use client";

import { useState, useEffect } from "react";
import { type AppUser } from "@/lib/auth/CurrentUser";
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
  Key,
} from "lucide-react";
import { ManualUpload } from "./ManualUpload";

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
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  barNumber: string | null;
  lawFirm: string | null;
  licenseState: string | null;
  licenseStatus: "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED";
  licenseDocumentPath: string | null;
  licenseDocumentName: string | null;
  appliedAt: string;
  verifiedAt: string | null;
}

/**
 * Admin Dashboard Component
 * 
 * Only admins
 * Approvals, credential reviews, compliance
 */
export function AdminDashboard({ admin }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "approvals" | "credentials" | "compliance" | "manual-upload">("overview");
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
        // Load pending attorney applications
        const res = await fetch("/api/admin/attorneys/verify?status=PENDING");
        if (!res.ok) throw new Error("Failed to load attorney applications");
        const data = await res.json();
        // Transform nested user data to flat structure
        const flattened = (data.profiles || []).map((profile: any) => ({
          id: profile.id,
          userId: profile.userId,
          email: profile.user?.email || null,
          firstName: profile.user?.firstName || null,
          lastName: profile.user?.lastName || null,
          phone: profile.user?.phone || null,
          barNumber: profile.user?.barNumber || null,
          lawFirm: profile.lawFirm || null,
          licenseState: profile.licenseState || null,
          licenseStatus: profile.licenseStatus,
          licenseDocumentPath: profile.licenseDocumentPath || null,
          licenseDocumentName: profile.licenseDocumentName || null,
          appliedAt: profile.appliedAt,
          verifiedAt: profile.verifiedAt || null,
        }));
        setAttorneyCredentials(flattened);
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

  const handleVerifyAttorney = async (userId: string, status: "ACTIVE" | "SUSPENDED" | "REVOKED") => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/attorneys/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, licenseStatus: status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to verify attorney");
      }

      setSuccess(`Attorney ${status === "ACTIVE" ? "approved" : status.toLowerCase()}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify attorney");
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
              <Link href="/admin/console">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Admin Console
                </Button>
              </Link>
              <Link href="/admin/tokens">
                <Button variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  API Tokens
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
            <button
              onClick={() => setActiveTab("manual-upload")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "manual-upload"
                  ? "border-gold-500 text-gold-600"
                  : "border-transparent text-slateui-500 hover:text-slateui-700 hover:border-slateui-300"
              }`}
            >
              Manual Upload
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
                    View complete access logs and reconstruct &quot;who did what when&quot; for any record.
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
                <label htmlFor="statusFilter" className="text-sm font-medium text-ink-900">Filter by Status:</label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="px-3 py-2 border border-slateui-300 rounded-lg"
                  aria-label="Filter by Status"
                  title="Filter by Status"
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-ink-900">Pending Attorney Applications</h2>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Search by name, email, or bar number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadData()}
                  disabled={loading}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {loading && attorneyCredentials.length === 0 ? (
              <div className="text-center py-12 text-slateui-500">
                Loading applications...
              </div>
            ) : attorneyCredentials.length === 0 ? (
              <div className="text-center py-12 text-slateui-500">
                <UserCheck className="h-12 w-12 mx-auto mb-4 text-slateui-400" />
                <p className="text-lg font-medium mb-2">No Pending Applications</p>
                <p className="text-sm">All attorney applications have been reviewed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slateui-200">
                  <thead className="bg-slateui-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                        Attorney
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                        Law Firm
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                        Bar Information
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                        Applied
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slateui-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slateui-200">
                    {attorneyCredentials
                      .filter((cred) => {
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          cred.email?.toLowerCase().includes(query) ||
                          cred.firstName?.toLowerCase().includes(query) ||
                          cred.lastName?.toLowerCase().includes(query) ||
                          cred.barNumber?.toLowerCase().includes(query) ||
                          cred.lawFirm?.toLowerCase().includes(query)
                        );
                      })
                      .map((cred) => (
                        <tr key={cred.id} className="hover:bg-slateui-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-ink-900">
                              {cred.firstName} {cred.lastName}
                            </div>
                            <div className="text-xs text-slateui-500">{cred.email}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slateui-600">
                            {cred.phone || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slateui-600">
                            {cred.lawFirm || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slateui-600">
                              <div>Bar #: {cred.barNumber || "—"}</div>
                              {cred.licenseDocumentName && (
                                <div className="text-xs text-slateui-500 mt-1">
                                  <a
                                    href={`/api/admin/attorneys/verify/document?userId=${cred.userId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gold-600 hover:underline flex items-center gap-1"
                                  >
                                    <Download className="h-3 w-3" />
                                    View License
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slateui-600">
                            {new Date(cred.appliedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleVerifyAttorney(cred.userId, "ACTIVE")}
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
                                    handleVerifyAttorney(cred.userId, "REVOKED");
                                  }
                                }}
                                disabled={loading}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
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

        {activeTab === "manual-upload" && (
          <ManualUpload />
        )}
      </div>
    </div>
  );
}

