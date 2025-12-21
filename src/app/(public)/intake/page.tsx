"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

/**
 * Policy Intake Page (Client-Facing, No Account)
 * 
 * Form submission only
 * Upload optional document
 * No auth hooks
 * POST to /api/intake
 */
export default function IntakePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [receiptData, setReceiptData] = useState<{
    receiptId: string;
    qrCodeDataUrl: string;
    qrToken: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    decedentName: "",
    // Policy information
    policyNumber: "",
    policyType: "",
    insurerName: "",
    // Contact information (optional)
    contactEmail: "",
    contactPhone: "",
  });

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF or image file (JPEG, PNG)");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setUploadedFile(file);
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append("decedentName", formData.decedentName);
      submitData.append("policyNumber", formData.policyNumber || "");
      submitData.append("policyType", formData.policyType || "");
      submitData.append("insurerName", formData.insurerName || "");
      submitData.append("contactEmail", formData.contactEmail || "");
      submitData.append("contactPhone", formData.contactPhone || "");

      if (uploadedFile) {
        submitData.append("file", uploadedFile);
      }

      const res = await fetch("/api/intake", {
        method: "POST",
        body: submitData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to submit");

      setReceiptData({
        receiptId: data.receiptId,
        qrCodeDataUrl: data.qrCodeDataUrl,
        qrToken: data.qrToken,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success && receiptData) {
    return (
      <main className="min-h-screen bg-paper-50 py-6 sm:py-12">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          <div className="mb-8">
            <Logo size="sm" showTagline={false} className="flex-row" href="/" />
          </div>

          <div className="card p-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            
            <h1 className="font-display text-2xl font-bold text-ink-900 mb-3">
              Policy Submitted Successfully
            </h1>
            
            <p className="text-slateui-600 mb-6">
              Your policy information has been received and a cryptographic receipt has been generated.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-ink-900 mb-1">Receipt ID:</p>
              <p className="text-sm text-slateui-600 font-mono break-all">{receiptData.receiptId}</p>
            </div>

            {/* QR Code */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-ink-900 mb-3">
                Scan this QR code to update your submission:
              </p>
              <div className="flex justify-center">
                <div className="w-[300px] h-[300px] border-2 border-slateui-200 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptData.qrCodeDataUrl}
                    alt="QR Code for updating submission"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => {
                  setSuccess(false);
                  setFormData({
                    decedentName: "",
                    policyNumber: "",
                    policyType: "",
                    insurerName: "",
                    contactEmail: "",
                    contactPhone: "",
                  });
                  setUploadedFile(null);
                  setReceiptData(null);
                }}
                variant="outline"
              >
                Submit Another
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

        <div className="card p-6 mb-6">
          <h1 className="font-display text-2xl font-bold text-ink-900 mb-2">
            Submit Life Insurance Policy
          </h1>
          <p className="text-slateui-600">
            Upload your policy document or enter the information manually. No account required.
          </p>
        </div>

        {error && (
          <div className="card p-4 mb-6 bg-red-50 border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Document Upload Section */}
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-gold-500" />
              Upload Policy Document (Optional)
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label
                  htmlFor="file-upload"
                  className="flex-1 cursor-pointer rounded-lg border-2 border-dashed border-slateui-300 p-6 text-center hover:border-gold-500 transition-colors"
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-slateui-400" />
                    <span className="text-sm font-medium text-slateui-600">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-slateui-500">
                      PDF, JPEG, or PNG (max 10MB)
                    </span>
                  </div>
                </label>
              </div>

              {uploadedFile && (
                <div className="flex items-center justify-between rounded-lg bg-slateui-50 p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slateui-500" />
                    <span className="text-sm text-slateui-700">{uploadedFile.name}</span>
                    <span className="text-xs text-slateui-500">
                      ({(uploadedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedFile(null)}
                    className="text-slateui-400 hover:text-slateui-600"
                    aria-label="Remove uploaded file"
                    title="Remove uploaded file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
              Policy Information
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="decedentName" className="block text-sm font-medium text-ink-900 mb-1">
                  Decedent Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="decedentName"
                  type="text"
                  required
                  value={formData.decedentName}
                  onChange={(e) => setFormData({ ...formData, decedentName: e.target.value })}
                  placeholder="Full name of the policyholder"
                />
              </div>

              <div>
                <label htmlFor="policyNumber" className="block text-sm font-medium text-ink-900 mb-1">
                  Policy Number
                </label>
                <Input
                  id="policyNumber"
                  type="text"
                  value={formData.policyNumber}
                  onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                  placeholder="Policy number if available"
                />
              </div>

              <div>
                <label htmlFor="policyType" className="block text-sm font-medium text-ink-900 mb-1">
                  Policy Type
                </label>
                <Input
                  id="policyType"
                  type="text"
                  value={formData.policyType}
                  onChange={(e) => setFormData({ ...formData, policyType: e.target.value })}
                  placeholder="e.g., Term, Whole Life, Universal"
                />
              </div>

              <div>
                <label htmlFor="insurerName" className="block text-sm font-medium text-ink-900 mb-1">
                  Insurance Company
                </label>
                <Input
                  id="insurerName"
                  type="text"
                  value={formData.insurerName}
                  onChange={(e) => setFormData({ ...formData, insurerName: e.target.value })}
                  placeholder="Name of insurance company"
                />
              </div>

              <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium text-ink-900 mb-1">
                  Contact Email (Optional)
                </label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="contactPhone" className="block text-sm font-medium text-ink-900 mb-1">
                  Contact Phone (Optional)
                </label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || !formData.decedentName}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Policy"
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
