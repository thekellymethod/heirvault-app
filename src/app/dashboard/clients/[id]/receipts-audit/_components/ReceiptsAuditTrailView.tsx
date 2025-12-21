"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Shield,
  Clock,
  User,
  Hash,
  FileCheck,
  Calendar,
  AlertCircle,
  CheckCircle,
  Printer,
  Filter,
  Search,
  X,
} from "lucide-react";

type Receipt = {
  id: string;
  receiptNumber: string;
  createdAt: string;
  emailSent: boolean;
  emailSentAt: string | null;
  hash: string;
};

type AuditEntry = {
  id: string;
  action: string;
  message: string;
  actor: string;
  actorEmail: string | null;
  timestamp: string;
  policyId: string | null;
  hash: string;
};

type Summary = {
  totalReceipts: number;
  totalAuditEntries: number;
  firstEntry: string | null;
  lastEntry: string | null;
};

interface ReceiptsAuditTrailViewProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
}

export function ReceiptsAuditTrailView({
  clientId,
  clientName,
  clientEmail,
}: ReceiptsAuditTrailViewProps) {
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeTab, setActiveTab] = useState<"receipts" | "audit" | "reports">("receipts");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/receipts-audit`);
      if (!res.ok) {
        throw new Error("Failed to load receipts and audit trail");
      }
      const data = await res.json();
      setReceipts(data.receipts || []);
      setAuditLog(data.auditLog || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (receiptNumber: string) => {
    try {
      // Find the invite token for this client to generate receipt
      const res = await fetch(`/api/clients/${clientId}/receipt/${receiptNumber}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-${receiptNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to download receipt");
      }
    } catch (error) {
      console.error("Error downloading receipt:", error);
      alert("Failed to download receipt");
    }
  };

  const handleExportReport = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/receipts-audit/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-trail-${clientId}-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to export report");
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      alert("Failed to export report");
    }
  };

  const filteredAuditLog = auditLog.filter((entry) => {
    const matchesSearch = 
      entry.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.action.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterAction === "all" || entry.action === filterAction;
    
    return matchesSearch && matchesFilter;
  });

  const uniqueActions = Array.from(new Set(auditLog.map(e => e.action))).sort();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-slateui-600">Loading receipts and audit trail...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href={`/dashboard/clients/${clientId}`} className="text-slateui-600 hover:text-ink-900">
              ← Back to Client
            </Link>
          </div>
          <h1 className="font-display text-3xl text-ink-900">Receipts & Audit Trail</h1>
          <p className="mt-2 text-slateui-600">
            Legal defensibility records for <strong>{clientName}</strong> ({clientEmail})
          </p>
          <p className="mt-1 text-sm text-slateui-500">
            Immutable proof of submission, access, and verification with cryptographic hashes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportReport}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
          >
            <FileCheck className="h-4 w-4" />
            Export Full Report
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900" aria-label="Close error">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-sm text-slateui-600 mb-1">Total Receipts</div>
            <div className="text-2xl font-bold text-ink-900">{summary.totalReceipts}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slateui-600 mb-1">Audit Entries</div>
            <div className="text-2xl font-bold text-ink-900">{summary.totalAuditEntries}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slateui-600 mb-1">First Entry</div>
            <div className="text-sm font-medium text-ink-900">
              {summary.firstEntry ? new Date(summary.firstEntry).toLocaleDateString() : "N/A"}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slateui-600 mb-1">Last Entry</div>
            <div className="text-sm font-medium text-ink-900">
              {summary.lastEntry ? new Date(summary.lastEntry).toLocaleDateString() : "N/A"}
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slateui-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("receipts")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm ${
              activeTab === "receipts"
                ? "border-gold-500 text-ink-900"
                : "border-transparent text-slateui-600 hover:text-ink-900"
            }`}
          >
            <FileText className="h-4 w-4" />
            Receipts ({receipts.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm ${
              activeTab === "audit"
                ? "border-gold-500 text-ink-900"
                : "border-transparent text-slateui-600 hover:text-ink-900"
            }`}
          >
            <Shield className="h-4 w-4" />
            Audit Trail ({auditLog.length})
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm ${
              activeTab === "reports"
                ? "border-gold-500 text-ink-900"
                : "border-transparent text-slateui-600 hover:text-ink-900"
            }`}
          >
            <FileCheck className="h-4 w-4" />
            Reports
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "receipts" && (
          <ReceiptsTab receipts={receipts} onDownload={handleDownloadReceipt} />
        )}
        {activeTab === "audit" && (
          <AuditTrailTab
            auditLog={filteredAuditLog}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterAction={filterAction}
            onFilterChange={setFilterAction}
            uniqueActions={uniqueActions}
          />
        )}
        {activeTab === "reports" && (
          <ReportsTab clientId={clientId} clientName={clientName} onExport={handleExportReport} />
        )}
      </div>
    </div>
  );
}

function ReceiptsTab({ receipts, onDownload }: { receipts: Receipt[]; onDownload: (receiptNumber: string) => void }) {
  if (receipts.length === 0) {
    return (
      <div className="card p-12 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-slateui-400" />
        <p className="text-slateui-600">No receipts found for this client</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {receipts.map((receipt) => (
        <div key={receipt.id} className="card p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="h-5 w-5 text-gold-600" />
                <div>
                  <h3 className="font-semibold text-ink-900">{receipt.receiptNumber}</h3>
                  <p className="text-sm text-slateui-600">
                    Generated: {new Date(receipt.createdAt).toLocaleString()}
                  </p>
                </div>
                {receipt.emailSent && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Email Sent
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slateui-600">
                  <Hash className="h-3 w-3" />
                  <span className="font-mono break-all">{receipt.hash}</span>
                </div>
                {receipt.emailSentAt && (
                  <div className="flex items-center gap-2 text-xs text-slateui-600">
                    <Calendar className="h-3 w-3" />
                    <span>Email sent: {new Date(receipt.emailSentAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => onDownload(receipt.receiptNumber)}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditTrailTab({
  auditLog,
  searchQuery,
  onSearchChange,
  filterAction,
  onFilterChange,
  uniqueActions,
}: {
  auditLog: AuditEntry[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterAction: string;
  onFilterChange: (action: string) => void;
  uniqueActions: string[];
}) {
  if (auditLog.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-slateui-400" />
        <p className="text-slateui-600">No audit entries found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slateui-400" />
            <input
              type="text"
              placeholder="Search by action, message, or actor..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slateui-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slateui-400" />
            <select
              value={filterAction}
              onChange={(e) => onFilterChange(e.target.value)}
              className="px-4 py-2 border border-slateui-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Entries */}
      <div className="space-y-3">
        {auditLog.map((entry) => (
          <div key={entry.id} className="card p-4 border-l-4 border-l-gold-500">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-1 text-xs bg-gold-100 text-gold-700 rounded font-semibold">
                    {entry.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-slateui-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-ink-900 mb-2">{entry.message}</p>
                <div className="flex items-center gap-4 text-xs text-slateui-600">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{entry.actor}</span>
                    {entry.actorEmail && (
                      <span className="text-slateui-400">({entry.actorEmail})</span>
                    )}
                  </div>
                  {entry.policyId && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>Policy: {entry.policyId.substring(0, 8)}...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slateui-200">
              <div className="flex items-center gap-2 text-xs">
                <Hash className="h-3 w-3 text-slateui-400" />
                <span className="text-slateui-500 font-mono break-all">{entry.hash}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsTab({
  clientId,
  clientName,
  onExport,
}: {
  clientId: string;
  clientName: string;
  onExport: () => void;
}) {
  return (
    <div className="card p-6">
      <h2 className="font-display text-xl text-ink-900 mb-4">Legal Defensibility Reports</h2>
      <p className="text-sm text-slateui-600 mb-6">
        Generate comprehensive reports for disputes, compliance audits, and court proceedings.
        Reports include all receipts, audit trail entries, timestamps, and cryptographic hashes.
      </p>

      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-ink-900 mb-2 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-600" />
            Full Audit Trail Report
          </h3>
          <p className="text-sm text-slateui-600 mb-4">
            Complete report with all receipts, audit entries, timestamps, actors, actions, and cryptographic hashes.
            Suitable for legal proceedings and compliance audits.
          </p>
          <button onClick={onExport} className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export PDF Report
          </button>
        </div>

        <div className="p-4 border border-slateui-200 rounded-lg">
          <h3 className="font-semibold text-ink-900 mb-2">Report Contents</h3>
          <ul className="text-sm text-slateui-600 space-y-1 list-disc list-inside">
            <li>All receipts with cryptographic hashes</li>
            <li>Complete audit trail with timestamps</li>
            <li>Actor information (who performed each action)</li>
            <li>Action types and descriptions</li>
            <li>Immutable proof of submission and access</li>
            <li>Verification records</li>
            <li>Chain of custody documentation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

