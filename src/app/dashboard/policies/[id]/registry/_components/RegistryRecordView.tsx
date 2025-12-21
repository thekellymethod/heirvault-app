"use client";

import {
  FileText,
  Hash,
  Clock,
  User,
  Building2,
  CheckCircle,
  AlertCircle,
  History,
  Receipt,
  Eye,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Policy {
  id: string;
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
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  insurer: {
    id: string;
    name: string;
  };
}

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  documentHash: string;
  verifiedAt: Date | null;
  createdAt: Date;
}

interface Submission {
  id: string;
  status: string;
  submissionType: string;
  createdAt: Date;
  processedAt: Date | null;
}

interface AccessLog {
  id: string;
  action: string;
  message: string;
  userId: string | null;
  userName: string | null;
  createdAt: Date;
}

interface Receipt {
  id: string;
  receiptNumber: string;
  createdAt: Date;
}

interface RegistryRecordViewProps {
  policy: Policy;
  documents: Document[];
  submissions: Submission[];
  accessLogs: AccessLog[];
  receipts: Receipt[];
}

export function RegistryRecordView({
  policy,
  documents,
  submissions,
  accessLogs,
  receipts,
}: RegistryRecordViewProps) {
  const getStatusIcon = (status: Policy["verificationStatus"]) => {
    switch (status) {
      case "VERIFIED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "DISCREPANCY":
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case "INCOMPLETE":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "REJECTED":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-slateui-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900 mb-2 flex items-center gap-2">
              <Shield className="h-6 w-6 text-gold-500" />
              Registry Record
            </h1>
            <p className="text-slateui-600">
              Authoritative policy record with complete history and verification
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-slateui-50">
            {getStatusIcon(policy.verificationStatus)}
            <span className="font-semibold">{policy.verificationStatus}</span>
          </div>
        </div>
      </div>

      {/* Policy Record */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-gold-500" />
          Policy Record
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="label">Policy ID</label>
              <p className="text-ink-900 font-mono text-sm">{policy.id}</p>
            </div>
            <div>
              <label className="label">Policy Number</label>
              <p className="text-ink-900">{policy.policyNumber || "N/A"}</p>
            </div>
            <div>
              <label className="label">Policy Type</label>
              <p className="text-ink-900">{policy.policyType || "N/A"}</p>
            </div>
            <div>
              <label className="label flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Insurer
              </label>
              <p className="text-ink-900">{policy.insurer.name}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label flex items-center gap-2">
                <User className="h-4 w-4" />
                Client
              </label>
              <p className="text-ink-900">
                {policy.client.firstName} {policy.client.lastName}
              </p>
              <p className="text-sm text-slateui-600">{policy.client.email}</p>
            </div>
            <div>
              <label className="label">Created</label>
              <p className="text-ink-900">
                {new Date(policy.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="label">Last Updated</label>
              <p className="text-ink-900">
                {new Date(policy.updatedAt).toLocaleString()}
              </p>
            </div>
            {policy.verifiedAt && (
              <div>
                <label className="label">Verified At</label>
                <p className="text-ink-900">
                  {new Date(policy.verifiedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
        {policy.documentHash && (
          <div className="mt-4 pt-4 border-t border-slateui-200">
            <label className="label flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Document Hash (SHA-256)
            </label>
            <p className="text-xs font-mono text-slateui-600 break-all bg-slateui-50 p-2 rounded">
              {policy.documentHash}
            </p>
          </div>
        )}
        {policy.verificationNotes && (
          <div className="mt-4 pt-4 border-t border-slateui-200">
            <label className="label">Verification Notes</label>
            <p className="text-ink-900 whitespace-pre-wrap">{policy.verificationNotes}</p>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-gold-500" />
          Source Documents ({documents.length})
        </h2>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="border border-slateui-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-slateui-400" />
                    <h3 className="font-semibold text-ink-900">{doc.fileName}</h3>
                  </div>
                  <div className="text-sm text-slateui-600 space-y-1">
                    <p>Size: {(doc.fileSize / 1024).toFixed(1)} KB</p>
                    <p>Type: {doc.fileType}</p>
                    <p>Uploaded: {new Date(doc.createdAt).toLocaleString()}</p>
                    {doc.verifiedAt && (
                      <p className="text-green-600">
                        Verified: {new Date(doc.verifiedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <label className="label text-xs">Document Hash</label>
                    <p className="text-xs font-mono text-slateui-600 break-all bg-slateui-50 p-2 rounded">
                      {doc.documentHash}
                    </p>
                  </div>
                </div>
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
          ))}
        </div>
      </div>

      {/* Receipts */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-gold-500" />
          Receipts ({receipts.length})
        </h2>
        <div className="space-y-2">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="border border-slateui-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-ink-900 font-mono">{receipt.receiptNumber}</p>
                <p className="text-sm text-slateui-600">
                  {new Date(receipt.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/clients/${policy.client.id}/receipt/${receipt.receiptNumber}`, "_blank")}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Submission History */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-gold-500" />
          Submission History ({submissions.length})
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
                  {sub.processedAt && (
                    <p className="text-xs text-slateui-500">
                      Processed: {new Date(sub.processedAt).toLocaleString()}
                    </p>
                  )}
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

      {/* Access Logs */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gold-500" />
          Access Logs ({accessLogs.length})
        </h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {accessLogs.map((log) => (
            <div key={log.id} className="border border-slateui-200 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-ink-900">{log.action}</p>
                  <p className="text-sm text-slateui-600">{log.message}</p>
                  <p className="text-xs text-slateui-500 mt-1">
                    {new Date(log.createdAt).toLocaleString()}
                    {log.userName && ` • by ${log.userName}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

