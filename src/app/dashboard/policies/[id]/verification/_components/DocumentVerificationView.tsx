"use client";

import { useState } from "react";
import {
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Building2,
  User,
  Hash,
  Eye,
  Flag,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Policy {
  id: string,
  policyNumber: string | null;
  policyType: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "DISCREPANCY" | "INCOMPLETE" | "REJECTED";
  verifiedAt: Date | null;
  verifiedByUserId: string | null;
  verificationNotes: string | null;
  documentHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  client: {
    id: string,
    firstName: string,
    lastName: string,
    email: string,
  };
  insurer: {
    id: string,
    name: string,
  } | null;
  carrierNameRaw?: string | null;
}

interface Document {
  id: string,
  fileName: string,
  fileType: string,
  fileSize: number;
  filePath: string,
  mimeType: string,
  extractedData: Record<string, unknown>;
  ocrConfidence: number | null;
  documentHash: string,
  verifiedAt: Date | null;
  verifiedByUserId: string | null;
  verificationNotes: string | null;
  createdAt: Date;
}

interface Submission {
  id: string,
  status: string,
  submissionType: string,
  submittedData: Record<string, unknown>;
  createdAt: Date;
  processedAt: Date | null;
}

interface DocumentVerificationViewProps {
  policy: Policy;
  documents: Document[];
  submissions: Submission[];
  currentUserId: string,
  isAdmin?: boolean;
}

export function DocumentVerificationView({
  policy,
  documents,
  submissions,
  currentUserId,
  isAdmin = false,
}: DocumentVerificationViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState(policy.verificationStatus);
  const [verificationNotes, setVerificationNotes] = useState(policy.verificationNotes || "");
  const [resolveInsurerOpen, setResolveInsurerOpen] = useState(false);
  const [insurerName, setInsurerName] = useState(policy.carrierNameRaw || "");
  const [resolving, setResolving] = useState(false);

  const handleResolveInsurer = async () => {
    if (!insurerName.trim()) {
      setError("Insurer name is required");
      return;
    }

    setResolving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/policies/resolve-insurer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: policy.id,
          insurerName: insurerName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resolve insurer");
      }

      // Refresh the page to show updated policy
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve insurer");
    } finally {
      setResolving(false);
    }
  };

  const handleVerify = async (status: Policy["verificationStatus"]) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/policies/${policy.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationStatus: status,
          verificationNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update verification");

      setVerificationStatus(status);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Policy["verificationStatus"]) => {
    switch (status) {
      case "VERIFIED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "DISCREPANCY":
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case "INCOMPLETE":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "REJECTED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-slateui-400" />;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 mb-2">
              Document Verification
            </h1>
            <p className="text-slateui-600">
              Review and verify policy information and source documents
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${getStatusColor(verificationStatus)}`}>
            {getStatusIcon(verificationStatus)}
            <span className="font-semibold">{verificationStatus}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policy Information */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gold-500" />
            Policy Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="label">Policy Number</label>
              <p className="text-ink-900">{policy.policyNumber || "N/A"}</p>
            </div>
            <div>
              <label className="label">Policy Type</label>
              <p className="text-ink-900">{policy.policyType || "N/A"}</p>
            </div>
            <div>
              <label className="label">Insurer</label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slateui-400" />
                <div className="flex items-center gap-2 flex-1">
                  <p className="text-ink-900">
                    {policy.insurer?.name ?? policy.carrierNameRaw ?? "Unknown"}
                  </p>
                  {!policy.insurer && policy.carrierNameRaw && (
                    <>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">
                        Unresolved
                      </span>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResolveInsurerOpen(true)}
                          className="ml-2"
                        >
                          Resolve
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="label">Client</label>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slateui-400" />
                <p className="text-ink-900">
                  {policy.client.firstName} {policy.client.lastName}
                </p>
              </div>
              <p className="text-sm text-slateui-600">{policy.client.email}</p>
            </div>
            {policy.documentHash && (
              <div>
                <label className="label flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Document Hash
                </label>
                <p className="text-xs font-mono text-slateui-600 break-all">
                  {policy.documentHash}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Verification Actions */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Flag className="h-5 w-5 text-gold-500" />
            Verification Actions
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Verification Notes</label>
              <textarea
                className="input min-h-[100px]"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Add notes about verification, discrepancies, or follow-ups..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleVerify("VERIFIED")}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Verify
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleVerify("DISCREPANCY")}
                disabled={loading}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Flag Discrepancy
              </Button>
              <Button
                onClick={() => handleVerify("INCOMPLETE")}
                disabled={loading}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Clock className="h-4 w-4 mr-1" />
                Mark Incomplete
              </Button>
              <Button
                onClick={() => handleVerify("REJECTED")}
                disabled={loading}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-gold-500" />
          Source Documents ({documents.length})
        </h2>
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="border border-slateui-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-slateui-400" />
                    <h3 className="font-semibold text-ink-900">{doc.fileName}</h3>
                    {doc.ocrConfidence && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        OCR: {Math.round(doc.ocrConfidence)}%
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slateui-600 space-y-1">
                    <p>Size: {(doc.fileSize / 1024).toFixed(1)} KB</p>
                    <p>Type: {doc.fileType}</p>
                    <p className="font-mono text-xs break-all">
                      Hash: {doc.documentHash}
                    </p>
                    {doc.extractedData && (
                      <div className="mt-2 p-2 bg-slateui-50 rounded text-xs">
                        <p className="font-semibold mb-1">Extracted Data:</p>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(doc.extractedData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/api/documents/${doc.id}/download`, "_blank")}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submission History */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
          Submission History
        </h2>
        <div className="space-y-2">
          {submissions.map((sub) => (
            <div key={sub.id} className="border border-slateui-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-ink-900">{sub.submissionType}</p>
                  <p className="text-sm text-slateui-600">
                    {new Date(sub.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  sub.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                  sub.status === "PENDING" ? "bg-blue-100 text-blue-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {sub.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resolve Insurer Modal (Admin Only) */}
      {resolveInsurerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-ink-900 mb-4">Resolve Insurer</h2>
            <p className="text-sm text-slateui-600 mb-4">
              Enter the canonical insurer name to link this policy to an insurer record.
              {"If the insurer doesn't exist, it will be created."}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-900 mb-1">
                  Insurer Name
                </label>
                <Input
                  value={insurerName}
                  onChange={(e) => setInsurerName(e.target.value)}
                  placeholder="e.g., MetLife, Prudential, State Farm"
                  className="w-full"
                />
                {policy.carrierNameRaw && (
                  <p className="text-xs text-slateui-500 mt-1">
                    Current: {policy.carrierNameRaw}
                  </p>
                )}
              </div>
              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResolveInsurerOpen(false);
                    setError(null);
                    setInsurerName(policy.carrierNameRaw || "");
                  }}
                  disabled={resolving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResolveInsurer}
                  disabled={resolving || !insurerName.trim()}
                >
                  {resolving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    "Resolve"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

