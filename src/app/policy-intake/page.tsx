"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

/**
 * Policy Intake / Upload Page (Client-Facing, No Account)
 * 
 * This page allows policyholders or authorized contributors to submit
 * life insurance information without creating an account. Its function is
 * frictionless intake. Users either manually enter policy details or
 * upload documents for automated extraction.
 */
export default function PolicyIntakePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    // Client information
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    // Policy information
    policyNumber: "",
    policyType: "",
    insurerName: "",
    insurerPhone: "",
    insurerEmail: "",
  });

  // Handle file upload and extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setExtracting(true);
    setError(null);

    try {
      // Upload and extract data
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/policy-intake/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to extract data");

      // Apply extracted data to form
      if (data.extracted) {
        setExtractedData(data.extracted);
        setFormData((prev) => ({
          ...prev,
          firstName: data.extracted.firstName || prev.firstName,
          lastName: data.extracted.lastName || prev.lastName,
          email: data.extracted.email || prev.email,
          phone: data.extracted.phone || prev.phone,
          dateOfBirth: data.extracted.dateOfBirth || prev.dateOfBirth,
          policyNumber: data.extracted.policyNumber || prev.policyNumber,
          policyType: data.extracted.policyType || prev.policyType,
          insurerName: data.extracted.insurerName || prev.insurerName,
          insurerPhone: data.extracted.insurerPhone || prev.insurerPhone,
          insurerEmail: data.extracted.insurerEmail || prev.insurerEmail,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process document");
    } finally {
      setExtracting(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append("clientData", JSON.stringify({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
      }));
      submitData.append("policyData", JSON.stringify({
        policyNumber: formData.policyNumber,
        policyType: formData.policyType,
        insurerName: formData.insurerName,
        insurerPhone: formData.insurerPhone,
        insurerEmail: formData.insurerEmail,
      }));

      if (uploadedFile) {
        submitData.append("file", uploadedFile);
      }

      const res = await fetch("/api/policy-intake/submit", {
        method: "POST",
        body: submitData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to submit policy");

      setReceiptId(data.receiptId);
      
      // Store receipt data in sessionStorage for the receipt page
      if (data.receiptId) {
        sessionStorage.setItem(`receipt_${data.receiptId}`, JSON.stringify({
          receiptId: data.receiptId,
          qrToken: data.qrToken,
          qrCodeDataUrl: data.qrCodeDataUrl,
          submittedAt: new Date().toISOString(),
          decedentName: formData.firstName && formData.lastName 
            ? `${formData.firstName} ${formData.lastName}` 
            : undefined,
          policyNumber: formData.policyNumber || undefined,
          insurerName: formData.insurerName || undefined,
        }));
      }
      
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success && receiptId) {
    return (
      <main className="min-h-screen bg-paper-50 py-6 sm:py-12">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          <div className="mb-8">
            <Logo size="sm" showTagline={false} className="flex-row" href="/" />
          </div>

          <div className="card p-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" aria-hidden="true" />
            </div>
            
            <h1 className="font-display text-2xl font-bold text-ink-900 mb-3">
              Policy Submitted Successfully
            </h1>
            
            <p className="text-slateui-600 mb-6">
              Your policy information has been received and a cryptographic receipt has been generated.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-ink-900 mb-1">Receipt ID:</p>
              <p className="text-sm text-slateui-600 font-mono">{receiptId}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => router.push(`/policy-intake/receipt/${receiptId}`)}
                className="btn-primary"
              >
                View Receipt
              </Button>
              <Button
                onClick={() => {
                  setSuccess(false);
                  setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    dateOfBirth: "",
                    policyNumber: "",
                    policyType: "",
                    insurerName: "",
                    insurerPhone: "",
                    insurerEmail: "",
                  });
                  setUploadedFile(null);
                  setExtractedData(null);
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
          <div className="card p-4 mb-6 bg-red-50 border-red-200" role="alert">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Document Upload Section */}
          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-gold-500" aria-hidden="true" />
              Upload Policy Document (Optional)
            </h2>
            <p className="text-sm text-slateui-600 mb-4">
              {"Upload a PDF or image of your policy document. We'll automatically extract the information for you."}
            </p>
            
            <div className="border-2 border-dashed border-slateui-300 rounded-lg p-6 text-center">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
                disabled={extracting || loading}
                aria-label="Upload policy document"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {uploadedFile ? (
                  <>
                    <FileText className="h-12 w-12 text-gold-500" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-ink-900">{uploadedFile.name}</p>
                      <p className="text-sm text-slateui-600">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    {extracting && (
                      <div className="flex items-center gap-2 text-slateui-600">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span className="text-sm">Extracting data...</span>
                      </div>
                    )}
                    {extractedData && !extracting && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                        Data extracted successfully
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setUploadedFile(null);
                        setExtractedData(null);
                      }}
                      className="mt-2"
                    >
                      <X className="h-4 w-4 mr-1" aria-hidden="true" />
                      Remove
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-slateui-400" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-ink-900">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-slateui-600">
                        PDF, JPG, or PNG (max 10MB)
                      </p>
                    </div>
                  </>
                )}
              </label>
            </div>
          </section>

          {/* Client Information */}
          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-gold-500" aria-hidden="true" />
              Client Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="label">First Name <span className="text-red-500">*</span></label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="label">Last Name <span className="text-red-500">*</span></label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="label">Email <span className="text-red-500">*</span></label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="phone" className="label">Phone</label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="dateOfBirth" className="label">Date of Birth</label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Policy Information */}
          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gold-500" aria-hidden="true" />
              Policy Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="policyNumber" className="label">Policy Number</label>
                <Input
                  id="policyNumber"
                  value={formData.policyNumber}
                  onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="policyType" className="label">Policy Type</label>
                <Input
                  id="policyType"
                  value={formData.policyType}
                  onChange={(e) => setFormData({ ...formData, policyType: e.target.value })}
                  placeholder="e.g., Term Life, Whole Life"
                />
              </div>
              <div>
                <label htmlFor="insurerName" className="label">Insurer Name <span className="text-red-500">*</span></label>
                <Input
                  id="insurerName"
                  value={formData.insurerName}
                  onChange={(e) => setFormData({ ...formData, insurerName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="insurerPhone" className="label">Insurer Phone</label>
                <Input
                  id="insurerPhone"
                  type="tel"
                  value={formData.insurerPhone}
                  onChange={(e) => setFormData({ ...formData, insurerPhone: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="insurerEmail" className="label">Insurer Email</label>
                <Input
                  id="insurerEmail"
                  type="email"
                  value={formData.insurerEmail}
                  onChange={(e) => setFormData({ ...formData, insurerEmail: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="card p-6 bg-gold-50 border-gold-200">
            <p className="text-sm text-slateui-600 mb-4">
              By submitting, you agree that your information will be processed and stored securely.
              A cryptographic receipt will be generated for your records.
            </p>
            <Button
              type="submit"
              disabled={loading || extracting}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" aria-hidden="true" />
                  Submit Policy
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
