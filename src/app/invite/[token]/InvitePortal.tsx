"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { Upload, FileText, CheckCircle, XCircle, Building2, QrCode, Printer, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { PassportStyleForm } from "@/components/PassportStyleForm";

interface Props {
  inviteId: string;
  clientName: string;
  email: string;
  token: string;
  isAuthenticated: boolean;
}

export function InvitePortal(props: Props) {
  const { inviteId, clientName, email, token } = props;
  const router = useRouter();
  const [step, setStep] = useState<"form" | "processing" | "receipt" | "error">("form");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  
  // Client information form
  const [clientInfo, setClientInfo] = useState({
    firstName: clientName.split(" ")[0] || "",
    lastName: clientName.split(" ").slice(1).join(" ") || "",
    email: email || "",
    phone: "",
    dateOfBirth: "",
    ssnLast4: "",
    maidenName: "",
    driversLicense: "",
    passportNumber: "",
  });

  // Policy information
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualPolicyData, setManualPolicyData] = useState({
    insurerName: "",
    policyNumber: "",
    policyType: "",
  });

  // Update form (on receipt)
  const [updateForm, setUpdateForm] = useState({
    changes: "",
    newFile: null as File | null,
  });
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(selectedFile.type)) {
        setError("Invalid file type. Please upload a PDF or image file.");
        return;
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  }

  async function handleUpdateFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(selectedFile.type)) {
        setError("Invalid file type. Please upload a PDF or image file.");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }
      setUpdateForm({ ...updateForm, newFile: selectedFile });
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    // Validate required fields
    if (!clientInfo.ssnLast4 || clientInfo.ssnLast4.length !== 4) {
      setError("Please enter the last 4 digits of your SSN");
      return;
    }
    
    // Note: Maiden name validation would typically be done based on marital status
    // For now, we'll make it optional but note it's required for married women
    
    setStep("processing");

    try {
      const formData = new FormData();
      
      // Add client information
      formData.append("clientData", JSON.stringify(clientInfo));
      
      // Add file if provided
      if (file) {
        formData.append("file", file);
      }

      // Add manual policy data if provided
      if (showManualEntry && manualPolicyData.insurerName && manualPolicyData.policyNumber) {
        formData.append("policyData", JSON.stringify(manualPolicyData));
      }

      const res = await fetch(`/api/invite/${token}/upload-policy`, {
        method: "POST",
        body: formData,
      });

      // Read response as text first to handle both JSON and HTML responses
      const text = await res.text();
      
      // Check if response is HTML (error page)
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        throw new Error(
          res.status === 404
            ? "Invalid invitation code. Please check your link and try again."
            : res.status === 500
            ? "Server error. Please try again later."
            : "Server returned an HTML error page. Please try again later."
        );
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error("Failed to parse server response");
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit information");
      }

      // Fetch receipt data
      const receiptRes = await fetch(`/api/invite/${token}/receipt`);
      if (receiptRes.ok) {
        try {
          const receipt = await receiptRes.json();
          setReceiptData(receipt);
          setStep("receipt");
        } catch (parseError) {
          throw new Error("Failed to fetch receipt - invalid response format");
        }
      } else {
        throw new Error("Failed to fetch receipt");
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setStep("error");
    }
  }

  async function handleUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!updateForm.changes.trim() && !updateForm.newFile) return;

    setSubmittingUpdate(true);
    setError(null);

    try {
      const formData = new FormData();
      if (updateForm.newFile) {
        formData.append("file", updateForm.newFile);
      }
      if (updateForm.changes.trim()) {
        formData.append("changeRequest", updateForm.changes);
      }

      const res = await fetch(`/api/invite/${token}/upload-policy`, {
        method: "POST",
        body: formData,
      });

      // Read response as text first to handle both JSON and HTML responses
      const text = await res.text();
      
      // Check if response is HTML (error page)
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        throw new Error(
          res.status === 404
            ? "Invalid invitation code. Please check your link and try again."
            : res.status === 500
            ? "Server error. Please try again later."
            : "Server returned an HTML error page. Please try again later."
        );
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error("Failed to parse server response");
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit update");
      }

      alert("Your update has been submitted successfully. Your attorney will be notified.");
      setUpdateForm({ changes: "", newFile: null });
    } catch (e: any) {
      setError(e.message || "Failed to submit update");
    } finally {
      setSubmittingUpdate(false);
    }
  }

  // Generate update URL for QR code
  const updateUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/invite/${token}/update`
    : "";

  // Add print styles
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "print-styles";
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        #receipt-content, #receipt-content * {
          visibility: visible;
        }
        #receipt-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
    if (!document.getElementById("print-styles")) {
      document.head.appendChild(style);
    }
    return () => {
      const existingStyle = document.getElementById("print-styles");
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Receipt step
  if (step === "receipt" && receiptData) {
    return (
      <main className="min-h-screen bg-paper-50 py-12">
        <div className="mx-auto max-w-4xl px-6">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between no-print">
            <Logo size="sm" showTagline={false} className="flex-row gap-3" href="/" />
            <div className="flex items-center gap-3">
              <Button
                onClick={() => window.print()}
                className="btn-secondary flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
              <Button
                onClick={() => {
                  window.open(`/api/invite/${token}/receipt-pdf`, "_blank");
                }}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Link
                href="/"
                className="text-sm font-medium text-slateui-600 hover:text-ink-900 transition"
              >
                Back to Home
              </Link>
            </div>
          </div>

          {/* Receipt - Print-friendly */}
          <div className="card p-8 print:shadow-none print:border-0" id="receipt-content">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-500/10">
                <CheckCircle className="h-8 w-8 text-gold-600" />
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-ink-900">
                Registration Confirmed
              </h1>
              <p className="mt-2 text-sm text-slateui-600">
                Your policy information has been successfully registered.
              </p>
            </div>

            <div className="space-y-6">
              {/* Receipt Details */}
              <div className="rounded-xl border border-slateui-200 bg-paper-50 p-6">
                <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
                  Receipt Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slateui-600">Receipt ID:</span>
                    <p className="font-mono font-semibold text-ink-900 mt-1">{receiptData.receiptId}</p>
                  </div>
                  <div>
                    <span className="text-slateui-600">Registered At:</span>
                    <p className="font-semibold text-ink-900 mt-1">
                      {new Date(receiptData.receiptGeneratedAt || receiptData.registeredAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slateui-600">Client Name:</span>
                    <p className="font-semibold text-ink-900 mt-1">
                      {receiptData.client?.firstName || ""} {receiptData.client?.lastName || ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-slateui-600">Email:</span>
                    <p className="font-semibold text-ink-900 mt-1">{receiptData.client?.email || email}</p>
                  </div>
                </div>
              </div>

              {/* Policies */}
              {receiptData.policies && receiptData.policies.length > 0 && (
                <div className="rounded-xl border border-slateui-200 bg-paper-50 p-6">
                  <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gold-500" />
                    Registered Policies
                  </h2>
                  <div className="space-y-4">
                    {receiptData.policies.map((policy: any, index: number) => (
                      <div
                        key={policy.id || index}
                        className="rounded-lg border border-slateui-200 bg-white p-4"
                      >
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slateui-600">Insurer:</span>
                            <span className="font-semibold text-ink-900">
                              {policy.insurer?.name || policy.insurerName || "N/A"}
                            </span>
                          </div>
                          {policy.policyNumber && (
                            <div className="flex justify-between">
                              <span className="text-slateui-600">Policy Number:</span>
                              <span className="font-mono text-ink-900">{policy.policyNumber}</span>
                            </div>
                          )}
                          {policy.policyType && (
                            <div className="flex justify-between">
                              <span className="text-slateui-600">Policy Type:</span>
                              <span className="text-ink-900">{policy.policyType}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Organization Info */}
              {receiptData.organization && (
                <div className="rounded-xl border border-slateui-200 bg-paper-50 p-6">
                  <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-gold-500" />
                    Attorney Firm
                  </h2>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slateui-600">Firm Name:</span>
                      <p className="font-semibold text-ink-900 mt-1">{receiptData.organization.name}</p>
                    </div>
                    {receiptData.organization.phone && (
                      <div>
                        <span className="text-slateui-600">Phone:</span>
                        <p className="text-ink-900 mt-1">{receiptData.organization.phone}</p>
                      </div>
                    )}
                    {receiptData.organization.addressLine1 && (
                      <div>
                        <span className="text-slateui-600">Address:</span>
                        <p className="text-ink-900 mt-1">
                          {[
                            receiptData.organization.addressLine1,
                            receiptData.organization.addressLine2,
                            receiptData.organization.city,
                            receiptData.organization.state,
                            receiptData.organization.postalCode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* QR Code and Update Form */}
              <div className="rounded-xl border border-slateui-200 bg-paper-50 p-6">
                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  {/* QR Code */}
                  <div className="flex-shrink-0">
                    <div className="bg-white p-4 rounded-lg border border-slateui-200 inline-block">
                      <QRCodeSVG
                        value={updateUrl}
                        size={150}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <p className="text-xs text-slateui-600 mt-2 text-center max-w-[150px]">
                      Scan to update your information
                    </p>
                  </div>

                  {/* Update Form */}
                  <div className="flex-1">
                    <h2 className="font-display text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-gold-500" />
                      Update Your Information
                    </h2>
                    <p className="text-sm text-slateui-600 mb-4">
                      Fill out this passport-style form to update your information. You can fill it digitally, or print it, fill it by hand, scan it, and upload it.
                    </p>
                    {error && (
                      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}
                    <PassportStyleForm
                      initialData={{
                        firstName: receiptData.client?.firstName || "",
                        lastName: receiptData.client?.lastName || "",
                        email: receiptData.client?.email || email,
                        phone: receiptData.client?.phone || "",
                        dateOfBirth: receiptData.client?.dateOfBirth
                          ? new Date(receiptData.client.dateOfBirth).toISOString().split("T")[0]
                          : "",
                        policyNumber: receiptData.policies?.[0]?.policyNumber || "",
                        insurerName: receiptData.policies?.[0]?.insurer?.name || "",
                        policyType: receiptData.policies?.[0]?.policyType || "",
                      }}
                      onSubmit={async (formData) => {
                        setSubmittingUpdate(true);
                        setError(null);
                        try {
                          // Submit form data
                          const res = await fetch(`/api/invite/${token}/upload-policy`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              clientData: {
                                firstName: formData.firstName,
                                lastName: formData.lastName,
                                email: formData.email,
                                phone: formData.phone,
                                dateOfBirth: formData.dateOfBirth,
                              },
                              policyData: {
                                policyNumber: formData.policyNumber,
                                insurerName: formData.insurerName,
                                policyType: formData.policyType,
                              },
                            }),
                          });
                          const text = await res.text();
                          if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
                            throw new Error("Server returned an error page");
                          }
                          const data = JSON.parse(text);
                          if (!res.ok) throw new Error(data.error || "Failed to submit update");
                          alert("Your update has been submitted successfully. Your attorney will be notified.");
                          // Refresh receipt data
                          const receiptRes = await fetch(`/api/invite/${token}/receipt`);
                          if (receiptRes.ok) {
                            const receipt = await receiptRes.json();
                            setReceiptData(receipt);
                          }
                        } catch (e: any) {
                          setError(e.message || "Failed to submit update");
                        } finally {
                          setSubmittingUpdate(false);
                        }
                      }}
                      onPrint={async () => {
                        try {
                          const res = await fetch(`/api/invite/${token}/update-form-pdf`);
                          if (res.ok) {
                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `update-form-${receiptData.receiptId}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          }
                        } catch (e) {
                          setError("Failed to generate PDF form");
                        }
                      }}
                    />
                    <div className="mt-4 pt-4 border-t border-slateui-200">
                      <p className="text-xs text-slateui-600 mb-3">
                        <strong>Or upload a scanned form:</strong>
                      </p>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!updateForm.newFile) return;
                        setSubmittingUpdate(true);
                        setError(null);
                        try {
                          const formData = new FormData();
                          formData.append("file", updateForm.newFile);
                          const res = await fetch(`/api/invite/${token}/process-update-form`, {
                            method: "POST",
                            body: formData,
                          });
                          const text = await res.text();
                          if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
                            throw new Error("Server returned an error page");
                          }
                          const data = JSON.parse(text);
                          if (!res.ok) throw new Error(data.error || "Failed to process form");
                          alert("Form processed successfully! Updated receipt has been sent to your email.");
                          // Refresh receipt
                          const receiptRes = await fetch(`/api/invite/${token}/receipt`);
                          if (receiptRes.ok) {
                            const receipt = await receiptRes.json();
                            setReceiptData(receipt);
                          }
                          setUpdateForm({ ...updateForm, newFile: null });
                        } catch (e: any) {
                          setError(e.message || "Failed to process scanned form");
                        } finally {
                          setSubmittingUpdate(false);
                        }
                      }} className="space-y-3">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="input text-sm"
                          onChange={handleUpdateFileUpload}
                        />
                        {updateForm.newFile && (
                          <div className="flex items-center gap-2 text-sm text-slateui-600">
                            <FileText className="h-4 w-4" />
                            <span>{updateForm.newFile.name}</span>
                            <button
                              type="button"
                              onClick={() => setUpdateForm({ ...updateForm, newFile: null })}
                              className="text-red-600 hover:text-red-700 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        {updateForm.newFile && (
                          <Button
                            type="submit"
                            disabled={submittingUpdate}
                            className="btn-primary w-full"
                          >
                            {submittingUpdate ? "Processing..." : "Process Scanned Form"}
                          </Button>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-6 border-t border-slateui-200 text-center">
                <p className="text-xs text-slateui-500">
                  This receipt confirms your registration in the HeirVault private registry.
                  <br />
                  Private, voluntary registry • Not affiliated with insurers or regulators
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error step
  if (step === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-paper-50 px-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-900 mb-2">Error</h1>
            <p className="text-sm text-slateui-600 mb-6">{error || "Something went wrong"}</p>
            <div className="flex gap-3">
              <Button onClick={() => setStep("form")} className="btn-primary flex-1">
                Try Again
              </Button>
              <Link href="/" className="btn-secondary flex-1 text-center">
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Form step
  return (
    <main className="min-h-screen bg-paper-50 py-6 sm:py-12 overflow-x-hidden">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Logo size="sm" showTagline={false} className="flex-row gap-3" href="/" />
          <Link
            href="/"
            className="text-sm font-medium text-slateui-600 hover:text-ink-900 transition"
          >
            Back to Home
          </Link>
        </div>

        {/* Registration Form */}
        <div className="card p-8">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-ink-900">
              Complete Your Registration
            </h1>
            <p className="mt-2 text-sm text-slateui-600">
              Please provide your information and upload your life insurance policy document.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Client Information */}
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-ink-900">Your Information</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="label mb-1 block">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={clientInfo.firstName}
                    onChange={(e) => setClientInfo({ ...clientInfo, firstName: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="label mb-1 block">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={clientInfo.lastName}
                    onChange={(e) => setClientInfo({ ...clientInfo, lastName: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="label mb-1 block">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="label mb-1 block">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className="label mb-1 block">Date of Birth</label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={clientInfo.dateOfBirth}
                    onChange={(e) => setClientInfo({ ...clientInfo, dateOfBirth: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ssnLast4" className="label mb-1 block">
                    Last 4 Digits of SSN <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="ssnLast4"
                    type="text"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    value={clientInfo.ssnLast4}
                    onChange={(e) => setClientInfo({ ...clientInfo, ssnLast4: e.target.value.replace(/\D/g, "").substring(0, 4) })}
                    className="input"
                    placeholder="1234"
                    required
                  />
                  <p className="text-xs text-slateui-500 mt-1">For identity verification</p>
                </div>
                <div>
                  <label htmlFor="maidenName" className="label mb-1 block">
                    Maiden Name <span className="text-red-500">*</span> (if married)
                  </label>
                  <input
                    id="maidenName"
                    type="text"
                    value={clientInfo.maidenName}
                    onChange={(e) => setClientInfo({ ...clientInfo, maidenName: e.target.value })}
                    className="input"
                    placeholder="Enter maiden name if you are a married woman"
                  />
                  <p className="text-xs text-slateui-500 mt-1">Required for married women</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="driversLicense" className="label mb-1 block">
                    Driver's License / ID Number
                  </label>
                  <input
                    id="driversLicense"
                    type="text"
                    value={clientInfo.driversLicense}
                    onChange={(e) => setClientInfo({ ...clientInfo, driversLicense: e.target.value })}
                    className="input"
                    placeholder="Enter DL/ID number"
                  />
                </div>
                <div>
                  <label htmlFor="passportNumber" className="label mb-1 block">
                    Passport Number (if no DL/ID)
                  </label>
                  <input
                    id="passportNumber"
                    type="text"
                    value={clientInfo.passportNumber}
                    onChange={(e) => setClientInfo({ ...clientInfo, passportNumber: e.target.value })}
                    className="input"
                    placeholder="Enter passport number"
                  />
                  <p className="text-xs text-slateui-500 mt-1">Provide either DL/ID or Passport number</p>
                </div>
              </div>
            </div>

            {/* Policy Information */}
            <div className="space-y-4 pt-4 border-t border-slateui-200">
              <h2 className="font-display text-lg font-semibold text-ink-900">Policy Information</h2>

              {/* File Upload */}
              <div>
                <label htmlFor="policy-file" className="label mb-1 block">
                  Policy Document (First Page)
                </label>
                <input
                  id="policy-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="input"
                />
                <p className="mt-2 text-xs text-slateui-500">
                  Accepted formats: PDF, JPG, PNG (max 10MB)
                </p>
              </div>

              {file && (
                <div className="rounded-lg border border-slateui-200 bg-paper-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500/10">
                        <FileText className="h-5 w-5 text-gold-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink-900">{file.name}</p>
                        <p className="text-xs text-slateui-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-sm text-slateui-500 hover:text-ink-900"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Entry Option */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slateui-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-paper-50 px-2 text-slateui-500">Or</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowManualEntry(!showManualEntry)}
                  className="text-sm font-medium text-gold-600 hover:text-gold-700"
                >
                  {showManualEntry ? "Hide" : "Enter Policy Details Manually"}
                </button>

                {showManualEntry && (
                  <div className="mt-4 space-y-4 rounded-lg border border-slateui-200 bg-paper-50 p-4">
                    <div>
                      <label className="label mb-1 block">
                        Insurer Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualPolicyData.insurerName}
                        onChange={(e) =>
                          setManualPolicyData({ ...manualPolicyData, insurerName: e.target.value })
                        }
                        className="input"
                        placeholder="e.g., Acme Life Insurance"
                        required={showManualEntry}
                      />
                    </div>
                    <div>
                      <label className="label mb-1 block">
                        Policy Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualPolicyData.policyNumber}
                        onChange={(e) =>
                          setManualPolicyData({ ...manualPolicyData, policyNumber: e.target.value })
                        }
                        className="input"
                        placeholder="Enter policy number"
                        required={showManualEntry}
                      />
                    </div>
                    <div>
                      <label className="label mb-1 block">Policy Type (Optional)</label>
                      <input
                        type="text"
                        value={manualPolicyData.policyType}
                        onChange={(e) =>
                          setManualPolicyData({ ...manualPolicyData, policyType: e.target.value })
                        }
                        className="input"
                        placeholder="e.g., Term, Whole Life, Universal Life"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={
                step === "processing" ||
                !clientInfo.firstName ||
                !clientInfo.lastName ||
                !clientInfo.email ||
                (!file && (!showManualEntry || !manualPolicyData.insurerName || !manualPolicyData.policyNumber))
              }
              className="btn-primary w-full"
            >
              {step === "processing" ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Registration
                </>
              )}
            </Button>
          </form>

          {step === "processing" && (
            <div className="mt-6 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gold-500 border-t-transparent"></div>
              <p className="text-sm text-slateui-600">
                Processing your information and registering your policy...
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
