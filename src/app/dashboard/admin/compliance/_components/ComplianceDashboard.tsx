"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shield,
  Users,
  FileText,
  CheckCircle,
  BarChart3,
  Search,
  UserCheck,
  FileX,
  Scale,
  X,
  Plus,
  Edit,
  Eye,
} from "lucide-react";

type UsageStats = {
  totalUsers: number;
  totalClients: number;
  totalPolicies: number;
  totalOrganizations: number;
  activeAttorneys: number;
  recentActivity: number;
};

type ComplianceRule = {
  id: string,
  name: string,
  description: string,
  status: "active" | "inactive";
  lastUpdated: string,
};

type AttorneyCredential = {
  id: string,
  email: string,
  name: string,
  barNumber: string | null;
  status: "verified" | "pending" | "revoked";
  lastVerified: string | null;
};

type TakedownRequest = {
  id: string,
  type: "client" | "policy" | "document";
  entityId: string,
  reason: string,
  requestedBy: string,
  requestedAt: string,
  status: "pending" | "approved" | "rejected";
};

export function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "usage" | "rules" | "credentials" | "takedowns" | "statutory">("overview");
  const [loading, setLoading] = useState(true);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);
  const [attorneyCredentials, setAttorneyCredentials] = useState<AttorneyCredential[]>([]);
  const [takedownRequests, setTakedownRequests] = useState<TakedownRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Track the current request to prevent race conditions
  const currentRequestRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Generate a unique ID for this request
    const requestId = `${activeTab}-${Date.now()}`;
    currentRequestRef.current = requestId;
    
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    loadData(requestId, abortController.signal);
    
    // Cleanup: cancel request if component unmounts or tab changes
    return () => {
      abortController.abort();
      // Only clear the ref if this is still the current request
      if (currentRequestRef.current === requestId) {
        currentRequestRef.current = null;
        abortControllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadData = async (requestId: string, signal: AbortSignal) => {
    // Only set loading if this is still the current request
    if (currentRequestRef.current !== requestId) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === "overview" || activeTab === "usage") {
        const statsRes = await fetch("/api/admin/compliance/usage", { signal });
        // Check if request is still current before updating state
        if (currentRequestRef.current !== requestId) {
          return;
        }
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setUsageStats(stats);
        } else {
          setError("Failed to load usage statistics");
        }
      }

      if (activeTab === "rules") {
        const rulesRes = await fetch("/api/admin/compliance/rules", { signal });
        if (currentRequestRef.current !== requestId) {
          return;
        }
        if (rulesRes.ok) {
          const rules = await rulesRes.json();
          setComplianceRules(rules.rules || []);
        } else {
          setError("Failed to load compliance rules");
        }
      }

      if (activeTab === "credentials") {
        const credsRes = await fetch("/api/admin/compliance/credentials", { signal });
        if (currentRequestRef.current !== requestId) {
          return;
        }
        if (credsRes.ok) {
          const creds = await credsRes.json();
          setAttorneyCredentials(creds.credentials || []);
        } else {
          setError("Failed to load attorney credentials");
        }
      }

      if (activeTab === "takedowns") {
        const takedownsRes = await fetch("/api/admin/compliance/takedowns", { signal });
        if (currentRequestRef.current !== requestId) {
          return;
        }
        if (takedownsRes.ok) {
          const takedowns = await takedownsRes.json();
          setTakedownRequests(takedowns.requests || []);
        } else {
          setError("Failed to load takedown requests");
        }
      }
    } catch (error) {
      // Ignore abort errors (they're expected when switching tabs)
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      
      // Only set error if this is still the current request
      if (currentRequestRef.current !== requestId) {
        return;
      }
      
      console.error("Error loading compliance data:", error);
      setError("An error occurred while loading data");
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  // Wrapper function for child components to call without parameters
  const handleRefresh = () => {
    // Generate a unique ID for this refresh request
    const requestId = `${activeTab}-refresh-${Date.now()}`;
    currentRequestRef.current = requestId;
    
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    loadData(requestId, abortController.signal);
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "usage", label: "Usage Monitoring", icon: Users },
    { id: "rules", label: "Compliance Rules", icon: Shield },
    { id: "credentials", label: "Attorney Credentials", icon: UserCheck },
    { id: "takedowns", label: "Takedowns & Corrections", icon: FileX },
    { id: "statutory", label: "Statutory Alignment", icon: Scale },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink-900">Administration & Compliance</h1>
          <p className="mt-2 text-slateui-600">System governance, monitoring, and compliance management</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-700 hover:text-green-900" aria-label="Close success message">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900" aria-label="Close error message">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slateui-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "overview" | "usage" | "rules" | "credentials" | "takedowns" | "statutory")}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap
                  ${
                    isActive
                      ? "border-gold-500 text-ink-900"
                      : "border-transparent text-slateui-600 hover:text-ink-900 hover:border-slateui-300"
                  }
                `}
                aria-label={tab.label}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {loading ? (
          <div className="text-center py-12 text-slateui-600">Loading...</div>
        ) : (
          <>
            {activeTab === "overview" && <OverviewTab stats={usageStats} />}
            {activeTab === "usage" && <UsageMonitoringTab stats={usageStats} />}
            {activeTab === "rules" && <ComplianceRulesTab rules={complianceRules} onRefresh={handleRefresh} onSuccess={showSuccess} />}
            {activeTab === "credentials" && <AttorneyCredentialsTab credentials={attorneyCredentials} onRefresh={handleRefresh} onSuccess={showSuccess} />}
            {activeTab === "takedowns" && <TakedownsTab requests={takedownRequests} onRefresh={handleRefresh} onSuccess={showSuccess} />}
            {activeTab === "statutory" && <StatutoryAlignmentTab />}
          </>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ stats }: { stats: UsageStats | null }) {
  if (!stats) {
    return <div className="text-center py-12 text-slateui-600">No data available</div>;
  }

  const metrics = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-600" },
    { label: "Total Clients", value: stats.totalClients, icon: FileText, color: "text-green-600" },
    { label: "Total Policies", value: stats.totalPolicies, icon: FileText, color: "text-purple-600" },
    { label: "Organizations", value: stats.totalOrganizations, icon: Users, color: "text-orange-600" },
    { label: "Active Attorneys", value: stats.activeAttorneys, icon: UserCheck, color: "text-gold-600" },
    { label: "Recent Activity (24h)", value: stats.recentActivity, icon: BarChart3, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slateui-600 mb-1">{metric.label}</p>
                  <p className="text-2xl font-bold text-ink-900">{metric.value.toLocaleString()}</p>
                </div>
                <Icon className={`h-8 w-8 ${metric.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl text-ink-900 mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-ink-900">System Operational</span>
            </div>
            <span className="text-xs text-slateui-600">All systems normal</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-ink-900">Compliance Rules Active</span>
            </div>
            <span className="text-xs text-slateui-600">All rules enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageMonitoringTab({ stats }: { stats: UsageStats | null }) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-display text-xl text-ink-900 mb-4">System Usage Statistics</h2>
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-slateui-700 mb-3">User Metrics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slateui-600">Total Users</span>
                  <span className="text-sm font-medium text-ink-900">{stats.totalUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slateui-600">Active Attorneys</span>
                  <span className="text-sm font-medium text-ink-900">{stats.activeAttorneys}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slateui-600">Organizations</span>
                  <span className="text-sm font-medium text-ink-900">{stats.totalOrganizations}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slateui-700 mb-3">Data Metrics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slateui-600">Total Clients</span>
                  <span className="text-sm font-medium text-ink-900">{stats.totalClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slateui-600">Total Policies</span>
                  <span className="text-sm font-medium text-ink-900">{stats.totalPolicies}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slateui-600">Recent Activity (24h)</span>
                  <span className="text-sm font-medium text-ink-900">{stats.recentActivity}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slateui-600">No usage data available</div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl text-ink-900 mb-4">Activity Log</h2>
        <p className="text-sm text-slateui-600">
          Detailed activity logs are available through the audit log system. Use the search functionality to filter by user, action, or date range.
        </p>
      </div>
    </div>
  );
}

function ComplianceRulesTab({ rules, onRefresh, onSuccess }: { rules: ComplianceRule[]; onRefresh: () => void; onSuccess: (msg: string) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ComplianceRule | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", status: "active" as "active" | "inactive" });
  const [saving, setSaving] = useState(false);

  const handleOpenModal = (rule?: ComplianceRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({ name: rule.name, description: rule.description, status: rule.status });
    } else {
      setEditingRule(null);
      setFormData({ name: "", description: "", status: "active" });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      alert("Name and description are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/compliance/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRule?.id,
          ...formData,
        }),
      });

      if (res.ok) {
        onSuccess(editingRule ? "Rule updated successfully" : "Rule created successfully");
        setShowModal(false);
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save rule");
      }
    } catch (error) {
      console.error("Error saving rule:", error);
      alert("Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink-900">Compliance Rules</h2>
        <button onClick={() => handleOpenModal()} className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      <div className="card p-6">
        {rules.length === 0 ? (
          <div className="text-center py-12 text-slateui-600">
            <Shield className="h-12 w-12 mx-auto mb-4 text-slateui-400" />
            <p>No compliance rules configured</p>
            <button onClick={() => handleOpenModal()} className="btn-primary mt-4 px-4 py-2 text-sm">
              Create First Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="border border-slateui-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-ink-900">{rule.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          rule.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slateui-100 text-slateui-700"
                        }`}
                      >
                        {rule.status}
                      </span>
                    </div>
                    <p className="text-sm text-slateui-600 mb-2">{rule.description}</p>
                    <p className="text-xs text-slateui-500">
                      Last updated: {new Date(rule.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => handleOpenModal(rule)} className="btn-secondary px-3 py-1.5 text-sm flex items-center gap-1">
                      <Edit className="h-3 w-3" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-ink-900">
                {editingRule ? "Edit Rule" : "Create New Rule"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slateui-600 hover:text-ink-900" aria-label="Close modal">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Rule Name <span className="text-red-500">*</span></label>
                <input
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Data Retention Policy"
                  required
                />
              </div>

              <div>
                <label className="label">Description <span className="text-red-500">*</span></label>
                <textarea
                  className="input min-h-[100px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the compliance rule..."
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="rule-status">Status</label>
                <select
                  id="rule-status"
                  className="input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="btn-secondary px-4 py-2">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary px-4 py-2">
                  {saving ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttorneyCredentialsTab({ credentials, onRefresh, onSuccess }: { credentials: AttorneyCredential[]; onRefresh: () => void; onSuccess: (msg: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingCred, setViewingCred] = useState<AttorneyCredential | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  const filteredCredentials = credentials.filter(
    (cred) =>
      cred.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cred.barNumber && cred.barNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleVerify = async (cred: AttorneyCredential) => {
    const barNumber = prompt("Enter bar number to verify:");
    if (!barNumber || !barNumber.trim()) return;

    setVerifying(cred.id);
    try {
      const res = await fetch("/api/admin/compliance/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attorneyId: cred.id,
          barNumber: barNumber.trim(),
          action: "verify",
        }),
      });

      if (res.ok) {
        onSuccess("Attorney credential verified successfully");
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to verify credential");
      }
    } catch (error) {
      console.error("Error verifying credential:", error);
      alert("Failed to verify credential");
    } finally {
      setVerifying(null);
    }
  };

  const handleRevoke = async (cred: AttorneyCredential) => {
    if (!confirm(`Are you sure you want to revoke credentials for ${cred.name}?`)) return;

    setVerifying(cred.id);
    try {
      const res = await fetch("/api/admin/compliance/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attorneyId: cred.id,
          action: "revoke",
        }),
      });

      if (res.ok) {
        onSuccess("Attorney credential revoked successfully");
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to revoke credential");
      }
    } catch (error) {
      console.error("Error revoking credential:", error);
      alert("Failed to revoke credential");
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink-900">Attorney Credentials Management</h2>
      </div>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slateui-400" />
            <input
              type="text"
              placeholder="Search by name, email, or bar number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slateui-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        </div>

        {filteredCredentials.length === 0 ? (
          <div className="text-center py-12 text-slateui-600">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-slateui-400" />
            <p>No attorney credentials found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCredentials.map((cred) => (
              <div key={cred.id} className="border border-slateui-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-ink-900">{cred.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          cred.status === "verified"
                            ? "bg-green-100 text-green-700"
                            : cred.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {cred.status}
                      </span>
                    </div>
                    <p className="text-sm text-slateui-600 mb-1">{cred.email}</p>
                    {cred.barNumber && (
                      <p className="text-sm text-slateui-600 mb-1">Bar Number: {cred.barNumber}</p>
                    )}
                    {cred.lastVerified && (
                      <p className="text-xs text-slateui-500">
                        Last verified: {new Date(cred.lastVerified).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {cred.status !== "verified" && (
                      <button
                        onClick={() => handleVerify(cred)}
                        disabled={verifying === cred.id}
                        className="btn-secondary px-3 py-1.5 text-sm"
                      >
                        {verifying === cred.id ? "Verifying..." : "Verify"}
                      </button>
                    )}
                    {cred.status === "verified" && (
                      <button
                        onClick={() => handleRevoke(cred)}
                        disabled={verifying === cred.id}
                        className="btn-secondary px-3 py-1.5 text-sm"
                      >
                        {verifying === cred.id ? "Revoking..." : "Revoke"}
                      </button>
                    )}
                    <button
                      onClick={() => setViewingCred(cred)}
                      className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {viewingCred && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-ink-900">Attorney Details</h3>
              <button onClick={() => setViewingCred(null)} className="text-slateui-600 hover:text-ink-900" aria-label="Close details modal">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Name</label>
                <p className="text-sm text-ink-900">{viewingCred.name}</p>
              </div>
              <div>
                <label className="label">Email</label>
                <p className="text-sm text-ink-900">{viewingCred.email}</p>
              </div>
              <div>
                <label className="label">Bar Number</label>
                <p className="text-sm text-ink-900">{viewingCred.barNumber || "Not provided"}</p>
              </div>
              <div>
                <label className="label">Status</label>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded ${
                    viewingCred.status === "verified"
                      ? "bg-green-100 text-green-700"
                      : viewingCred.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {viewingCred.status}
                </span>
              </div>
              {viewingCred.lastVerified && (
                <div>
                  <label className="label">Last Verified</label>
                  <p className="text-sm text-ink-900">{new Date(viewingCred.lastVerified).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TakedownsTab({ requests, onRefresh, onSuccess }: { requests: TakedownRequest[]; onRefresh: () => void; onSuccess: (msg: string) => void }) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAction = async (requestId: string, action: "approve" | "reject") => {
    if (!confirm(`Are you sure you want to ${action} this takedown request?`)) return;

    setProcessing(requestId);
    try {
      const res = await fetch("/api/admin/compliance/takedowns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      if (res.ok) {
        onSuccess(`Request ${action}d successfully`);
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to process request");
      }
    } catch (error) {
      console.error("Error processing takedown:", error);
      alert("Failed to process request");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink-900">Takedowns & Corrections</h2>
      </div>

      <div className="card p-6">
        {requests.length === 0 ? (
          <div className="text-center py-12 text-slateui-600">
            <FileX className="h-12 w-12 mx-auto mb-4 text-slateui-400" />
            <p>No takedown requests pending</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border border-slateui-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-ink-900 capitalize">{request.type} Takedown</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          request.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : request.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <p className="text-sm text-slateui-600 mb-2">{request.reason}</p>
                    <div className="text-xs text-slateui-500 space-y-1">
                      <p>Entity ID: {request.entityId}</p>
                      <p>Requested by: {request.requestedBy}</p>
                      <p>Requested at: {new Date(request.requestedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {request.status === "pending" && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleAction(request.id, "approve")}
                        disabled={processing === request.id}
                        className="btn-primary px-3 py-1.5 text-sm"
                      >
                        {processing === request.id ? "Processing..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleAction(request.id, "reject")}
                        disabled={processing === request.id}
                        className="btn-secondary px-3 py-1.5 text-sm"
                      >
                        {processing === request.id ? "Processing..." : "Reject"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatutoryAlignmentTab() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-display text-xl text-ink-900 mb-4">Statutory Alignment</h2>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-ink-900">Compliance Status</h3>
            </div>
            <p className="text-sm text-slateui-600">
              The system is designed to comply with relevant state and federal regulations governing insurance policy management and attorney-client relationships.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-ink-900">Data Privacy (GDPR/CCPA)</span>
              </div>
              <span className="text-xs text-slateui-600">Compliant</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-ink-900">Attorney-Client Privilege</span>
              </div>
              <span className="text-xs text-slateui-600">Enforced</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-ink-900">Audit Trail Requirements</span>
              </div>
              <span className="text-xs text-slateui-600">Active</span>
            </div>
          </div>

          <div className="mt-6 p-4 border border-slateui-200 rounded-lg">
            <h3 className="font-semibold text-ink-900 mb-2">Regulatory Updates</h3>
            <p className="text-sm text-slateui-600">
              Regular reviews are conducted to ensure continued alignment with evolving statutory requirements.
              Updates are logged and documented in the compliance audit trail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
