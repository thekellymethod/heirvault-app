"use client";

import {
  FileText,
  Hash,
  Clock,
  CheckCircle,
  AlertCircle,
  History,
  Eye,
  Shield,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { type User } from "@/lib/auth";
import { type RegistryWithVersions } from "@/lib/db";

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  documentHash: string;
  registryVersionId: string | null;
  createdAt: Date;
  verifiedAt: Date | null;
}

interface RecordDetailViewProps {
  registry: RegistryWithVersions;
  documentsByVersion: Map<string, Document[]>;
  user: User;
}

export function RecordDetailView({
  registry,
  documentsByVersion,
  user,
}: RecordDetailViewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-100 text-green-800 border-green-200";
      case "PENDING_VERIFICATION":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DISPUTED":
        return "bg-red-100 text-red-800 border-red-200";
      case "ARCHIVED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <CheckCircle className="h-5 w-5" />;
      case "PENDING_VERIFICATION":
        return <Clock className="h-5 w-5" />;
      case "DISPUTED":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const latestData = registry.latestVersion?.dataJson as Record<string, unknown> | undefined;

  return (
    <div className="min-h-screen bg-paper-50 py-6">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
                Registry Record
              </h1>
              <p className="text-slateui-600">
                Complete registry history and documentation
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>

          {/* Registry Info Card */}
          <div className="card p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-ink-900 mb-2">
                  {registry.decedentName}
                </h2>
                <p className="text-sm text-slateui-500 font-mono mb-2">
                  Registry ID: {registry.id}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-medium ${getStatusColor(registry.status)}`}
              >
                {getStatusIcon(registry.status)}
                {registry.status.replace("_", " ")}
              </span>
            </div>

            {/* Current Data Summary */}
            {latestData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slateui-200">
                {latestData.policyNumber && (
                  <div>
                    <span className="text-sm font-medium text-slateui-600">Policy Number:</span>{" "}
                    <span className="text-sm text-ink-900">{String(latestData.policyNumber)}</span>
                  </div>
                )}
                {latestData.policyType && (
                  <div>
                    <span className="text-sm font-medium text-slateui-600">Policy Type:</span>{" "}
                    <span className="text-sm text-ink-900">{String(latestData.policyType)}</span>
                  </div>
                )}
                {latestData.insurerName && (
                  <div>
                    <span className="text-sm font-medium text-slateui-600">Insurance Company:</span>{" "}
                    <span className="text-sm text-ink-900">{String(latestData.insurerName)}</span>
                  </div>
                )}
                {latestData.contactEmail && (
                  <div>
                    <span className="text-sm font-medium text-slateui-600">Contact Email:</span>{" "}
                    <span className="text-sm text-ink-900">{String(latestData.contactEmail)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Versions History */}
        <div className="card p-6 mb-6">
          <h3 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </h3>
          <div className="space-y-4">
            {registry.versions.map((version, index) => {
              const versionDocs = documentsByVersion.get(version.id) || [];
              const versionData = version.dataJson as Record<string, unknown>;
              const delta = versionData.delta as Record<string, { from: unknown; to: unknown }> | undefined;

              return (
                <div key={version.id} className="border border-slateui-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-ink-900">
                        Version {registry.versions.length - index} - {version.submittedBy}
                      </div>
                      <div className="text-sm text-slateui-500">
                        {new Date(version.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-slateui-500 font-mono">
                      Hash: {version.hash.substring(0, 16)}...
                    </div>
                  </div>

                  {/* Delta (changes) */}
                  {delta && Object.keys(delta).length > 0 && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-sm font-medium text-ink-900 mb-2">Changes:</div>
                      <div className="space-y-1 text-sm">
                        {Object.entries(delta).map(([field, change]) => (
                          <div key={field} className="flex items-start gap-2">
                            <span className="font-medium text-slateui-600 capitalize">{field}:</span>
                            <span className="text-slateui-500">
                              {change.from ? String(change.from) : "(empty)"} → {change.to ? String(change.to) : "(empty)"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents for this version */}
                  {versionDocs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slateui-200">
                      <div className="text-sm font-medium text-ink-900 mb-2">Documents:</div>
                      <div className="space-y-2">
                        {versionDocs.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-slateui-50 rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slateui-500" />
                              <span className="text-sm text-ink-900">{doc.fileName}</span>
                              <span className="text-xs text-slateui-500">({formatFileSize(doc.fileSize)})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-slateui-500 font-mono">
                                Hash: {doc.documentHash.substring(0, 16)}...
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Access Logs */}
        <div className="card p-6">
          <h3 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Access Logs
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slateui-50 border-b border-slateui-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slateui-600 uppercase">Timestamp</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slateui-600 uppercase">Action</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slateui-600 uppercase">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slateui-200">
                {registry.accessLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 text-sm text-slateui-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-ink-900">{log.action}</td>
                    <td className="px-4 py-2 text-sm text-slateui-600">
                      {log.userId ? `User ${log.userId.substring(0, 8)}...` : "System"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

