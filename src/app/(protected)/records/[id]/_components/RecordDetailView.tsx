"use client";

import {
  FileText,
  Hash,
  Clock,
  CheckCircle,
  AlertCircle,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { type RegistryRecord, type RegistryVersion, type DocumentRow } from "@/lib/db";

interface RecordDetailViewProps {
  registry: RegistryRecord;
  versions: RegistryVersion[];
  documentsByVersion: Map<string, DocumentRow[]>;
}

export function RecordDetailView({
  registry,
  versions,
  documentsByVersion,
}: RecordDetailViewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-100 text-green-800 border-green-200";
      case "PENDING_VERIFICATION":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DISCREPANCY":
        return "bg-red-100 text-red-800 border-red-200";
      case "INCOMPLETE":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "REJECTED":
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
      case "DISCREPANCY":
        return <AlertCircle className="h-5 w-5" />;
      case "INCOMPLETE":
        return <AlertCircle className="h-5 w-5" />;
      case "REJECTED":
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

  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
  const latestData = latestVersion?.dataJson as Record<string, unknown> | undefined;

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
                {latestData.policyholder_name ? (
                  <div>
                    <span className="text-sm font-medium text-slateui-600">Policyholder:</span>{" "}
                    <span className="text-sm text-ink-900">
                      {String(latestData.policyholder_name)}
                    </span>
                  </div>
                ) : null}
                {latestData.insured_name ? (
                  <div>
                    <span className="text-sm font-medium text-slateui-600">Insured:</span>{" "}
                    <span className="text-sm text-ink-900">
                      {String(latestData.insured_name)}
                    </span>
                  </div>
                ) : null}
                {latestData.beneficiary_name ? (
                  <div>
                    <span className="text-sm font-medium text-slateui-600">Beneficiary:</span>{" "}
                    <span className="text-sm text-ink-900">
                      {String(latestData.beneficiary_name)}
                    </span>
                  </div>
                ) : null}
                {latestData.carrier_guess ? (
                  <div>
                    <span className="text-sm font-medium text-slateui-600">Carrier:</span>{" "}
                    <span className="text-sm text-ink-900">
                      {String(latestData.carrier_guess)}
                    </span>
                  </div>
                ) : null}
                {latestData.policy_number_optional ? (
                  <div>
                    <span className="text-sm font-medium text-slateui-600">Policy Number:</span>{" "}
                    <span className="text-sm text-ink-900">
                      {String(latestData.policy_number_optional)}
                    </span>
                  </div>
                ) : null}
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
            {versions.length === 0 ? (
              <div className="text-center py-8 text-slateui-500">
                No versions found for this registry.
              </div>
            ) : (
              versions.map((version, index) => {
                const versionDocs = documentsByVersion.get(version.id) || [];
                const versionData = version.dataJson as Record<string, unknown>;
                const delta = versionData.delta as Record<string, { from: unknown; to: unknown }> | undefined;

                return (
                  <div key={version.id} className="border border-slateui-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-ink-900">
                          Version {index + 1} - {version.submittedBy}
                        </div>
                        <div className="text-sm text-slateui-500">
                          {new Date(version.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-xs text-slateui-500 font-mono">
                        <Hash className="h-3 w-3 inline mr-1" />
                        {version.hash}
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
                                <Hash className="h-3 w-3 inline mr-1" />
                                {doc.sha256}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

