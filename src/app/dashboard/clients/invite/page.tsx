"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, Mail, FileText, X, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { DashboardLayout } from "../../_components/DashboardLayout";

type ClientFormData = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
};

type ExtractedData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
};

export default function InviteClientPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [extracting, setExtracting] = React.useState(false);
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [extractedData, setExtractedData] = React.useState<ExtractedData | null>(null);
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [inviteCode, setInviteCode] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [form, setForm] = React.useState<ClientFormData>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
  });

  // Handle file upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
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

      const res = await fetch("/api/documents/extract-policy", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to extract data");

      // Apply extracted data to form
      if (data.extracted) {
        setExtractedData(data.extracted);
        setForm((prev) => ({
          ...prev,
          firstName: data.extracted.firstName || prev.firstName,
          lastName: data.extracted.lastName || prev.lastName,
          email: data.extracted.email || prev.email,
          phone: data.extracted.phone || prev.phone,
          dateOfBirth: data.extracted.dateOfBirth || prev.dateOfBirth,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process document");
    } finally {
      setExtracting(false);
    }
  }

  // Submit form
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setInviteUrl(null);
    setInviteCode(null);

    try {
      const res = await fetch("/api/clients/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone?.trim() || null,
          dateOfBirth: form.dateOfBirth || null,
          sendInvite: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create client invite");

      if (data.invite?.inviteUrl) {
        setInviteUrl(data.invite.inviteUrl);
        const code = data.invite.inviteUrl.split("/invite/")[1];
        setInviteCode(code);
      }

      // Reset form
      setForm({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        dateOfBirth: "",
      });
      setUploadedFile(null);
      setExtractedData(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Show success state
  if (inviteUrl) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">
                Invitation Sent Successfully!
              </h1>
              <p className="mt-2 text-base text-slateui-600">
                The client has been created and an invitation has been sent.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/clients")}
              className="btn-secondary"
            >
              Back to Clients
            </Button>
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 text-gold-600">
              <Check className="h-5 w-5" />
              <span className="font-semibold">Client created and invitation sent</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label mb-1 block">Invitation Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="input flex-1 font-mono text-sm"
                  />
                  <Button
                    onClick={() => copyToClipboard(inviteUrl)}
                    className="btn-secondary"
                    title="Copy link"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={() => window.open(inviteUrl, "_blank")}
                    className="btn-secondary"
                    title="Open link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {inviteCode && (
                <div>
                  <label className="label mb-1 block">Invitation Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteCode}
                      className="input flex-1 font-mono text-sm font-semibold text-gold-700"
                    />
                    <Button
                      onClick={() => copyToClipboard(inviteCode)}
                      className="btn-secondary"
                      title="Copy code"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-slateui-500 mt-1">
                    Client can use this code to access their invitation portal.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slateui-200">
                <Button
                  onClick={() => {
                    setInviteUrl(null);
                    setInviteCode(null);
                    setForm({
                      email: "",
                      firstName: "",
                      lastName: "",
                      phone: "",
                      dateOfBirth: "",
                    });
                    setUploadedFile(null);
                    setExtractedData(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="btn-primary w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Invite Another Client
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">
              Invite Client
            </h1>
            <p className="mt-2 text-base text-slateui-600">
              Create a client record and send them an invitation to complete their registry.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/clients")}
            className="btn-secondary"
          >
            Back
          </Button>
        </div>

        {/* Document Upload Section */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-5 w-5 text-gold-500" />
            <h2 className="text-lg font-semibold text-ink-900">Upload Client Document (Optional)</h2>
          </div>
          <p className="text-sm text-slateui-600 mb-4">
            Upload a document to automatically extract client information.
          </p>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="hidden"
              disabled={extracting}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="btn-secondary"
            >
              {extracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadedFile ? "Change File" : "Choose File"}
                </>
              )}
            </Button>
            {uploadedFile && (
              <div className="flex items-center gap-2 text-sm text-slateui-600">
                <FileText className="h-4 w-4" />
                <span>{uploadedFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFile(null);
                    setExtractedData(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-red-600 hover:text-red-800 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {extractedData && (
            <div className="mt-4 rounded-xl border border-gold-400/30 bg-gold-500/10 p-4 text-sm text-ink-900">
              <p className="font-semibold mb-2">Data extracted from document:</p>
              <ul className="list-disc list-inside space-y-1 text-slateui-700">
                {extractedData.firstName && <li>Name: {extractedData.firstName} {extractedData.lastName}</li>}
                {extractedData.email && <li>Email: {extractedData.email}</li>}
                {extractedData.phone && <li>Phone: {extractedData.phone}</li>}
              </ul>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-ink-900 mb-4">Client Information</h2>
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="First name"
                value={form.firstName}
                onChange={(v) => setForm((s) => ({ ...s, firstName: v }))}
                required
              />
              <Field
                label="Last name"
                value={form.lastName}
                onChange={(v) => setForm((s) => ({ ...s, lastName: v }))}
                required
              />
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm((s) => ({ ...s, email: v }))}
                required
                type="email"
              />
              <Field
                label="Phone"
                value={form.phone}
                onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
                type="tel"
              />
              <Field
                label="Date of birth"
                value={form.dateOfBirth}
                onChange={(v) => setForm((s) => ({ ...s, dateOfBirth: v }))}
                type="date"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/clients")}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating & Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Create Client & Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="label mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      <input
        className="input mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        type={type}
      />
    </label>
  );
}

