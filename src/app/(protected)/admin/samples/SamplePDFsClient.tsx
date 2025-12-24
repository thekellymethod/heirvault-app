"use client";

import { FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SamplePDFsClient() {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-paper-50 py-6">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-slateui-600 hover:text-ink-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Admin Dashboard
          </Link>
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
            Sample PDFs
          </h1>
          <p className="text-slateui-600">
            View sample receipt and invitation form PDFs for demonstration purposes
          </p>
        </div>

        {/* PDF Viewers */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Sample Receipt PDF */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-gold-600" />
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink-900">
                    Sample Receipt PDF
                  </h2>
                  <p className="text-sm text-slateui-600">
                    Client ballot/receipt with QR code
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="border border-slateui-200 rounded-lg overflow-hidden bg-white">
                {baseUrl ? (
                  <iframe
                    src={`${baseUrl}/api/admin/samples/receipt-pdf`}
                    className="w-full h-[600px]"
                    title="Sample Receipt PDF"
                  />
                ) : (
                  <div className="w-full h-[600px] flex items-center justify-center bg-slateui-50">
                    <div className="text-center">
                      <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-gold-500 border-t-transparent mb-4" />
                      <p className="text-sm text-slateui-600">Loading PDF...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    const url = baseUrl || window.location.origin;
                    window.open(`${url}/api/admin/samples/receipt-pdf`, "_blank");
                  }}
                  className="btn-primary flex-1"
                  disabled={!baseUrl}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  onClick={() => {
                    const url = baseUrl || window.location.origin;
                    const link = document.createElement("a");
                    link.href = `${url}/api/admin/samples/receipt-pdf`;
                    link.download = "heirvault-sample-receipt.pdf";
                    link.click();
                  }}
                  className="btn-secondary flex-1"
                  disabled={!baseUrl}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>

          {/* Sample Invite Form PDF */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-gold-600" />
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink-900">
                    Sample Invite Form PDF
                  </h2>
                  <p className="text-sm text-slateui-600">
                    Invitation form for new policyholders
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="border border-slateui-200 rounded-lg overflow-hidden bg-white">
                {baseUrl ? (
                  <iframe
                    src={`${baseUrl}/api/admin/samples/invite-pdf`}
                    className="w-full h-[600px]"
                    title="Sample Invite Form PDF"
                  />
                ) : (
                  <div className="w-full h-[600px] flex items-center justify-center bg-slateui-50">
                    <div className="text-center">
                      <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-gold-500 border-t-transparent mb-4" />
                      <p className="text-sm text-slateui-600">Loading PDF...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    const url = baseUrl || window.location.origin;
                    window.open(`${url}/api/admin/samples/invite-pdf`, "_blank");
                  }}
                  className="btn-primary flex-1"
                  disabled={!baseUrl}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  onClick={() => {
                    const url = baseUrl || window.location.origin;
                    const link = document.createElement("a");
                    link.href = `${url}/api/admin/samples/invite-pdf`;
                    link.download = "heirvault-sample-invite-form.pdf";
                    link.click();
                  }}
                  className="btn-secondary flex-1"
                  disabled={!baseUrl}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="card p-4 mt-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <div>
              <p className="text-sm font-medium text-ink-900 mb-1">
                About Sample PDFs
              </p>
              <p className="text-sm text-slateui-600">
                These are demonstration PDFs showing the format and layout of receipts and invitation forms
                that are generated for clients. The actual PDFs will contain real client data and policy information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

