"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Download, Printer, CheckCircle, Mail, FileText } from "lucide-react";

interface ReceiptData {
  receiptId: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: Date | null;
  };
  policies: Array<{
    id: string;
    policyNumber: string | null;
    policyType: string | null;
    insurer: {
      name: string;
      contactPhone: string | null;
      contactEmail: string | null;
    };
  }>;
  organization: {
    name: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    phone: string | null;
  } | null;
  registeredAt: Date;
  receiptGeneratedAt: Date;
}

export default function ReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const receiptId = searchParams.get("receiptId");
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // First try to get from sessionStorage (if just submitted)
    if (receiptId) {
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
    }

    if (receiptId && token) {
      fetchReceipt();
    } else if (receiptId) {
      // Try to fetch from receipt endpoint
      fetchReceiptById();
    } else {
      setError("Receipt ID is required");
      setLoading(false);
    }
  }, [receiptId, token]);

  const fetchReceipt = async () => {
    try {
      const res = await fetch(`/api/invite/${token}/receipt`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load receipt");
      
      setReceiptData({
        receiptId: receiptId || data.receiptId,
        ...data,
      });
    } catch (e: any) {
      setError(e.message || "Failed to load receipt");
    } finally {
      setLoading(false);
    }
  };

  const fetchReceiptById = async () => {
    try {
      // Extract token from receipt ID if possible
      const match = receiptId?.match(/^REC-([^-]+)-/);
      if (match) {
        const lookupRes = await fetch(`/api/receipts/${receiptId}/lookup`);
        const lookupData = await lookupRes.json();
        if (lookupRes.ok && lookupData.token) {
          const res = await fetch(`/api/invite/${lookupData.token}/receipt`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to load receipt");
          
          setReceiptData({
            receiptId: receiptId || data.receiptId,
            ...data,
          });
        } else {
          throw new Error("Receipt not found");
        }
      } else {
        throw new Error("Invalid receipt ID format");
      }
    } catch (e: any) {
      setError(e.message || "Failed to load receipt");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptData || !token) return;
    
    try {
      const res = await fetch(`/api/invite/${token}/receipt-pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `heirvault-receipt-${receiptData.receiptId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600 mx-auto mb-4"></div>
          <p className="text-slateui-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !receiptData) {
    return (
      <div className="min-h-screen bg-paper-50 flex items-center justify-center px-4">
        <div className="card p-8 max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <FileText className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="font-display text-xl font-bold text-ink-900 mb-2">Receipt Not Found</h1>
          <p className="text-sm text-slateui-600 mb-6">{error || "Unable to load receipt"}</p>
          <Button onClick={() => router.push("/update-policy")} className="btn-primary">
            Return to Update Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-50 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slateui-200 bg-paper-50/85 backdrop-blur print:hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-6">
            <Logo size="sm" showTagline={false} className="flex-row gap-3" href="/" />
            <div className="flex gap-3">
              <Button onClick={handleDownloadPDF} className="btn-secondary">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={handlePrint} className="btn-primary">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-12 overflow-y-auto">
        {/* Success Message */}
        <div className="mb-8 card p-6 bg-green-50 border-green-200 print:hidden">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-green-900 mb-1">
                Update Confirmed Successfully!
              </h2>
              <p className="text-sm text-green-700 mb-3">
                Your information has been updated. A confirmation email with your receipt has been sent to{" "}
                <span className="font-semibold">{receiptData.client.email}</span>. Your attorney has also been notified.
              </p>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Mail className="h-4 w-4" />
                <span>Email confirmation sent</span>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt */}
        <div className="card p-8 print:p-4">
          {/* Receipt Header */}
          <div className="text-center mb-8 pb-6 border-b border-slateui-200">
            <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
              Registration Receipt
            </h1>
            <p className="text-slateui-600">Receipt ID: {receiptData.receiptId}</p>
            <p className="text-sm text-slateui-500 mt-2">
              Generated: {new Date(receiptData.receiptGeneratedAt).toLocaleString()}
            </p>
          </div>

          {/* Client Information */}
          <div className="mb-8">
            <h2 className="font-display text-xl font-semibold text-ink-900 mb-4">Client Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slateui-600 mb-1">Name</p>
                <p className="font-semibold text-ink-900">
                  {receiptData.client.firstName} {receiptData.client.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-slateui-600 mb-1">Email</p>
                <p className="font-semibold text-ink-900">{receiptData.client.email}</p>
              </div>
              {receiptData.client.phone && (
                <div>
                  <p className="text-sm text-slateui-600 mb-1">Phone</p>
                  <p className="font-semibold text-ink-900">{receiptData.client.phone}</p>
                </div>
              )}
              {receiptData.client.dateOfBirth && (
                <div>
                  <p className="text-sm text-slateui-600 mb-1">Date of Birth</p>
                  <p className="font-semibold text-ink-900">
                    {new Date(receiptData.client.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Policies */}
          {receiptData.policies.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display text-xl font-semibold text-ink-900 mb-4">Policies</h2>
              <div className="space-y-4">
                {receiptData.policies.map((policy, index) => (
                  <div key={policy.id || index} className="border border-slateui-200 rounded-lg p-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-slateui-600 mb-1">Policy Number</p>
                        <p className="font-semibold text-ink-900">{policy.policyNumber || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slateui-600 mb-1">Insurer</p>
                        <p className="font-semibold text-ink-900">{policy.insurer.name}</p>
                        {policy.insurer.contactPhone && (
                          <p className="text-xs text-slateui-500 mt-1">{policy.insurer.contactPhone}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-slateui-600 mb-1">Policy Type</p>
                        <p className="font-semibold text-ink-900">{policy.policyType || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Organization */}
          {receiptData.organization && (
            <div className="mb-8">
              <h2 className="font-display text-xl font-semibold text-ink-900 mb-4">Law Firm</h2>
              <div>
                <p className="font-semibold text-ink-900 mb-2">{receiptData.organization.name}</p>
                {receiptData.organization.addressLine1 && (
                  <p className="text-sm text-slateui-600">
                    {receiptData.organization.addressLine1}
                    {receiptData.organization.addressLine2 && `, ${receiptData.organization.addressLine2}`}
                    {receiptData.organization.city && `, ${receiptData.organization.city}`}
                    {receiptData.organization.state && `, ${receiptData.organization.state}`}
                    {receiptData.organization.postalCode && ` ${receiptData.organization.postalCode}`}
                  </p>
                )}
                {receiptData.organization.phone && (
                  <p className="text-sm text-slateui-600 mt-1">{receiptData.organization.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slateui-200 text-center text-sm text-slateui-600">
            <p>Registered: {new Date(receiptData.registeredAt).toLocaleDateString()}</p>
            <p className="mt-2">
              This receipt confirms your registration with HeirVault. Please keep this for your records.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3 justify-center print:hidden">
          <Button onClick={() => router.push("/update-policy")} className="btn-secondary">
            Update Another Policy
          </Button>
          {token && (
            <Button onClick={() => router.push(`/invite/${token}/update`)} className="btn-secondary">
              Make Another Update
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

