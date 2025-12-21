"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  Download,
  Printer,
  CheckCircle,
  AlertCircle,
  Loader2,
  QrCode,
} from "lucide-react";
import Image from "next/image";

interface ReceiptData {
  receiptId: string;
  qrToken?: string;
  qrCodeDataUrl?: string;
  submittedAt: Date | string;
  decedentName?: string;
  policyNumber?: string;
  insurerName?: string;
}

/**
 * Policy Intake Receipt Page
 * 
 * Displays the receipt for a policy intake submission.
 * Shows receipt ID, QR code for updates, and submission details.
 */
export default function PolicyIntakeReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = params.receiptId as string;

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to get receipt data from sessionStorage first (if just submitted)
    const stored = sessionStorage.getItem(`receipt_${receiptId}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setReceiptData({
          receiptId: receiptId || data.receiptId,
          ...data,
        });
        setLoading(false);
        // Clean up sessionStorage
        sessionStorage.removeItem(`receipt_${receiptId}`);
        return;
      } catch (e) {
        // Invalid stored data, continue to fetch
      }
    }

    // Fetch receipt data from API
    fetchReceipt();
  }, [receiptId]);

  const fetchReceipt = async () => {
    try {
      const res = await fetch(`/api/policy-intake/receipt/${receiptId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load receipt");
      }

      setReceiptData({
        receiptId: data.receiptId,
        submittedAt: new Date(data.submittedAt),
        decedentName: data.decedentName || undefined,
        policyNumber: data.policyNumber || undefined,
        insurerName: data.insurerName || undefined,
        // QR token and QR code are not available for old policy-intake submissions
        // These are only available for the new registry-based intake system
      });
    } catch (e: any) {
      setError(e.message || "Failed to load receipt");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptData) return;
    
    try {
      // TODO: Create PDF generation endpoint
      // For now, use browser print
      window.print();
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Failed to generate PDF. Please use the print function instead.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold-500 mx-auto mb-4" />
          <p className="text-slateui-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !receiptData) {
    return (
      <main className="min-h-screen bg-paper-50 py-6 sm:py-12">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          <div className="mb-8">
            <Logo size="sm" showTagline={false} className="flex-row" href="/" />
          </div>

          <div className="card p-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            
            <h1 className="font-display text-2xl font-bold text-ink-900 mb-3">
              Receipt Not Found
            </h1>
            
            <p className="text-slateui-600 mb-6">
              {error || "Unable to load receipt. Please ensure you have the correct receipt ID."}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-ink-900 mb-1">Receipt ID:</p>
              <p className="text-sm text-slateui-600 font-mono break-all">{receiptId}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => router.push("/policy-intake")}
                className="btn-primary"
              >
                Submit New Policy
              </Button>
              <Button
                onClick={() => router.push("/")}
                variant="outline"
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper-50 py-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="mb-8">
          <Logo size="sm" showTagline={false} className="flex-row" href="/" />
        </div>

        <div className="card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Receipt className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-900 mb-2">
              Policy Submission Receipt
            </h1>
            <p className="text-slateui-600">
              Your policy information has been successfully submitted and recorded.
            </p>
          </div>

          {/* Receipt ID */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-ink-900 mb-1">Receipt ID:</p>
            <p className="text-sm text-slateui-600 font-mono break-all">{receiptData.receiptId}</p>
            <p className="text-xs text-slateui-500 mt-2">
              Save this receipt ID for your records. You'll need it to reference your submission.
            </p>
          </div>

          {/* Submission Details */}
          {receiptData.decedentName || receiptData.policyNumber || receiptData.insurerName ? (
            <div className="border border-slateui-200 rounded-lg p-6 mb-6">
              <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
                Submission Details
              </h2>
              <div className="space-y-3 text-sm">
                {receiptData.decedentName && (
                  <div className="flex justify-between">
                    <span className="font-medium text-ink-900">Decedent Name:</span>
                    <span className="text-slateui-600">{receiptData.decedentName}</span>
                  </div>
                )}
                {receiptData.policyNumber && (
                  <div className="flex justify-between">
                    <span className="font-medium text-ink-900">Policy Number:</span>
                    <span className="text-slateui-600">{receiptData.policyNumber}</span>
                  </div>
                )}
                {receiptData.insurerName && (
                  <div className="flex justify-between">
                    <span className="font-medium text-ink-900">Insurance Company:</span>
                    <span className="text-slateui-600">{receiptData.insurerName}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-slateui-200">
                  <span className="font-medium text-ink-900">Submitted At:</span>
                  <span className="text-slateui-600">
                    {new Date(receiptData.submittedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* QR Code for Updates */}
          {receiptData.qrCodeDataUrl && receiptData.qrToken && (
            <div className="border border-slateui-200 rounded-lg p-6 mb-6 text-center">
              <h2 className="font-display text-lg font-semibold text-ink-900 mb-2 flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5 text-gold-500" />
                Update Your Submission
              </h2>
              <p className="text-sm text-slateui-600 mb-4">
                Scan this QR code to update your policy information or view your submission.
              </p>
              <div className="flex justify-center">
                <div className="w-[250px] h-[250px] border-2 border-slateui-200 rounded-lg overflow-hidden bg-white p-2">
                  <Image
                    src={receiptData.qrCodeDataUrl}
                    alt="QR Code for updating submission"
                    width={250}
                    height={250}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-xs text-slateui-500 mt-4">
                Or visit: <span className="font-mono text-ink-900">/update/{receiptData.qrToken}</span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              onClick={() => router.push("/policy-intake")}
              className="btn-primary"
            >
              Submit Another Policy
            </Button>
          </div>

          {/* Important Notice */}
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Keep this receipt ID for your records</li>
                  <li>Use the QR code to update your submission if needed</li>
                  <li>This receipt provides proof of your submission</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

