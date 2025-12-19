"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, Search, X, FileText, Loader2 } from "lucide-react";
import { DashboardLayout } from "../../_components/DashboardLayout";

type CreateClientBody = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
};

type Insurer = {
  id: string;
  name: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  website?: string | null;
};

type PolicyData = {
  insurerId: string;
  insurerName?: string;
  policyNumber?: string;
  policyType?: string;
};

type ExtractedData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  policyNumber?: string;
  policyType?: string;
  insurerName?: string;
};

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [extracting, setExtracting] = React.useState(false);

  // Client form state
  const [form, setForm] = React.useState<CreateClientBody>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
  });

  // Insurer and policy state
  const [insurers, setInsurers] = React.useState<Insurer[]>([]);
  const [loadingInsurers, setLoadingInsurers] = React.useState(false);
  const [insurerSearch, setInsurerSearch] = React.useState("");
  const [selectedInsurerId, setSelectedInsurerId] = React.useState("");
  const [showNewInsurer, setShowNewInsurer] = React.useState(false);
  const [newInsurer, setNewInsurer] = React.useState({
    name: "",
    contactPhone: "",
    contactEmail: "",
    website: "",
  });

  // Policy state
  const [policy, setPolicy] = React.useState<PolicyData>({
    insurerId: "",
    policyNumber: "",
    policyType: "",
  });

  // File upload state
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [extractedData, setExtractedData] = React.useState<ExtractedData | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load insurers on mount
  React.useEffect(() => {
    loadInsurers();
  }, []);

  async function loadInsurers() {
    setLoadingInsurers(true);
    try {
      const res = await fetch("/api/insurers");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load insurers");
      setInsurers(data.insurers || []);
    } catch (e) {
      console.error("Failed to load insurers:", e);
    } finally {
      setLoadingInsurers(false);
    }
  }

  // Search NAIC companies when user types
  const [naicCompanies, setNaicCompanies] = React.useState<any[]>([]);
  const [loadingNaic, setLoadingNaic] = React.useState(false);

  React.useEffect(() => {
    if (insurerSearch.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        searchNaicCompanies(insurerSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setNaicCompanies([]);
    }
  }, [insurerSearch]);

  async function searchNaicCompanies(query: string) {
    setLoadingNaic(true);
    try {
      const res = await fetch(`/api/insurers/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      if (res.ok) {
        setNaicCompanies(data.companies || []);
      }
    } catch (e) {
      console.error("Failed to search NAIC companies:", e);
    } finally {
      setLoadingNaic(false);
    }
  }

  async function createInsurerFromNaic(naicCompany: any) {
    try {
      const res = await fetch("/api/insurers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: naicCompany.name,
          contactPhone: null,
          contactEmail: null,
          website: null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create insurer");

      await loadInsurers();
      setSelectedInsurerId(data.insurerId);
      setPolicy((prev) => ({ ...prev, insurerId: data.insurerId }));
      setInsurerSearch("");
      setNaicCompanies([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create insurer");
    }
  }

  // Filter insurers based on search
  const filteredInsurers = React.useMemo(() => {
    if (!insurerSearch.trim()) return insurers;
    const query = insurerSearch.toLowerCase();
    return insurers.filter((insurer) =>
      insurer.name.toLowerCase().includes(query)
    );
  }, [insurers, insurerSearch]);

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

        if (data.extracted.policyNumber) {
          setPolicy((prev) => ({
            ...prev,
            policyNumber: data.extracted.policyNumber,
            policyType: data.extracted.policyType || prev.policyType,
          }));
        }

        // Try to match insurer
        if (data.extracted.insurerName) {
          const matchedInsurer = insurers.find(
            (ins) =>
              ins.name.toLowerCase() === data.extracted.insurerName?.toLowerCase()
          );
          if (matchedInsurer) {
            setSelectedInsurerId(matchedInsurer.id);
            setPolicy((prev) => ({ ...prev, insurerId: matchedInsurer.id }));
          } else {
            // Set insurer name for new insurer creation
            setNewInsurer((prev) => ({
              ...prev,
              name: data.extracted.insurerName || "",
            }));
            setShowNewInsurer(true);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process document");
    } finally {
      setExtracting(false);
    }
  }

  // Create new insurer
  async function createInsurer() {
    if (!newInsurer.name.trim()) {
      setError("Insurer name is required");
      return;
    }

    try {
      const res = await fetch("/api/insurers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newInsurer.name.trim(),
          contactPhone: newInsurer.contactPhone.trim() || null,
          contactEmail: newInsurer.contactEmail.trim() || null,
          website: newInsurer.website.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create insurer");

      // Reload insurers and select the new one
      await loadInsurers();
      setSelectedInsurerId(data.insurerId);
      setPolicy((prev) => ({ ...prev, insurerId: data.insurerId }));
      setShowNewInsurer(false);
      setNewInsurer({ name: "", contactPhone: "", contactEmail: "", website: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create insurer");
    }
  }

  // Submit form
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Determine insurer ID
      let insurerId = selectedInsurerId;
      if (!insurerId && showNewInsurer && newInsurer.name.trim()) {
        // Create insurer first
        const insurerRes = await fetch("/api/insurers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newInsurer.name.trim(),
            contactPhone: newInsurer.contactPhone.trim() || null,
            contactEmail: newInsurer.contactEmail.trim() || null,
            website: newInsurer.website.trim() || null,
          }),
        });
        
        // Check content-type before parsing JSON
        const insurerContentType = insurerRes.headers.get("content-type");
        if (!insurerContentType || !insurerContentType.includes("application/json")) {
          const text = await insurerRes.text();
          throw new Error(
            insurerRes.status === 500
              ? "Server error while creating insurer. Please try again later."
              : `Unexpected response format. Status: ${insurerRes.status}`
          );
        }
        
        const insurerData = await insurerRes.json();
        if (!insurerRes.ok) throw new Error(insurerData?.error || "Failed to create insurer");
        insurerId = insurerData.insurerId;
      }

      // Create client with policy
      const res = await fetch("/api/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone?.trim() || null,
          dateOfBirth: form.dateOfBirth ? form.dateOfBirth : null,
          // Include policy data if insurer is selected
          policy: insurerId
            ? {
                insurerId,
                policyNumber: policy.policyNumber?.trim() || null,
                policyType: policy.policyType?.trim() || null,
              }
            : undefined,
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create client");

      const clientId = data.id || data.client?.id;
      if (!clientId) {
        throw new Error("Client created but no ID returned");
      }

      router.push(`/dashboard/clients/${clientId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">New Client</h1>
          <p className="mt-2 text-base text-slateui-600">
            Create a client record and optionally add their insurance policy information.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/clients")} className="btn-secondary">
          Back
        </Button>
      </div>

      {/* Document Upload Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-5 w-5 text-gold-500" />
          <h2 className="text-lg font-semibold text-ink-900">Upload Policy Document (Optional)</h2>
        </div>
        <p className="text-sm text-slateui-600 mb-4">
          Upload the first page of a policy document to automatically extract client and policy information.
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
            disabled={extracting || uploading}
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
              {extractedData.policyNumber && <li>Policy Number: {extractedData.policyNumber}</li>}
              {extractedData.insurerName && <li>Insurer: {extractedData.insurerName}</li>}
            </ul>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
        {/* Client Information Section */}
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
              value={form.phone || ""}
              onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
              type="tel"
            />
            <Field
              label="Date of birth"
              value={form.dateOfBirth || ""}
              onChange={(v) => setForm((s) => ({ ...s, dateOfBirth: v }))}
              type="date"
            />
          </div>
        </div>

        {/* Insurer Selection Section */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink-900 mb-4">Insurance Company</h2>

          {!showNewInsurer ? (
            <div className="space-y-4">
              <div>
                <label className="label mb-2 block">
                  Select Insurer
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slateui-400" />
                  <input
                    type="text"
                    value={insurerSearch}
                    onChange={(e) => setInsurerSearch(e.target.value)}
                    placeholder="Search for an insurer..."
                    className="input pl-10"
                  />
                </div>
                {insurerSearch && (
                  <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-slateui-200 bg-white shadow-lift">
                    {loadingInsurers || loadingNaic ? (
                      <div className="p-4 text-center text-sm text-slateui-600">Loading...</div>
                    ) : filteredInsurers.length === 0 && naicCompanies.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slateui-600">
                        No insurers found.{" "}
                        <button
                          type="button"
                          onClick={() => setShowNewInsurer(true)}
                          className="hover:underline text-gold-500"
                        >
                          Create new insurer
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Existing insurers from database */}
                        {filteredInsurers.slice(0, 10).map((insurer) => (
                          <button
                            key={insurer.id}
                            type="button"
                            onClick={() => {
                              setSelectedInsurerId(insurer.id);
                              setPolicy((prev) => ({ ...prev, insurerId: insurer.id }));
                              setInsurerSearch("");
                              setNaicCompanies([]);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm transition ${
                              selectedInsurerId === insurer.id
                                ? "bg-gold-500/20 text-ink-900"
                                : "text-ink-900 hover:bg-paper-100"
                            }`}
                          >
                            {insurer.name}
                          </button>
                        ))}
                        {/* NAIC companies (if no database matches) */}
                        {filteredInsurers.length === 0 && naicCompanies.length > 0 && (
                          <>
                            <div className="border-t border-slateui-200 px-4 py-2 text-xs font-semibold text-slateui-500">
                              NAIC Directory Companies
                            </div>
                            {naicCompanies.map((company, idx) => (
                              <button
                                key={`naic-${idx}`}
                                type="button"
                                onClick={() => createInsurerFromNaic(company)}
                                className="w-full px-4 py-2 text-left text-sm text-ink-900 hover:bg-paper-100 transition"
                              >
                                <div className="font-medium">{company.name}</div>
                                <div className="text-xs text-slateui-500">NAIC: {company.naicCode}</div>
                              </button>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
                {selectedInsurerId && !insurerSearch && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-gold-400/30 bg-gold-500/10 px-3 py-2">
                    <span className="text-sm text-ink-900">
                      {insurers.find((i) => i.id === selectedInsurerId)?.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInsurerId("");
                        setPolicy((prev) => ({ ...prev, insurerId: "" }));
                      }}
                      className="ml-auto hover:opacity-80 text-ink-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowNewInsurer(true)}
                  className="mt-2 text-sm hover:underline text-gold-500"
                >
                  + Create new insurer
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink-900">Create New Insurer</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewInsurer(false);
                    setNewInsurer({ name: "", contactPhone: "", contactEmail: "", website: "" });
                  }}
                  className="text-sm text-slateui-600 hover:text-ink-900 transition"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Insurer Name"
                  value={newInsurer.name}
                  onChange={(v) => setNewInsurer((s) => ({ ...s, name: v }))}
                  required
                />
                <Field
                  label="Contact Phone"
                  value={newInsurer.contactPhone}
                  onChange={(v) => setNewInsurer((s) => ({ ...s, contactPhone: v }))}
                  type="tel"
                />
                <Field
                  label="Contact Email"
                  value={newInsurer.contactEmail}
                  onChange={(v) => setNewInsurer((s) => ({ ...s, contactEmail: v }))}
                  type="email"
                />
                <Field
                  label="Website"
                  value={newInsurer.website}
                  onChange={(v) => setNewInsurer((s) => ({ ...s, website: v }))}
                  type="url"
                />
              </div>
            </div>
          )}
        </div>

        {/* Policy Information Section */}
        {(selectedInsurerId || showNewInsurer) && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-ink-900 mb-4">Policy Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Policy Number"
                value={policy.policyNumber || ""}
                onChange={(v) => setPolicy((s) => ({ ...s, policyNumber: v }))}
              />
              <div>
                <label className="label mb-1 block">
                  Policy Type
                </label>
                <select
                  value={policy.policyType || ""}
                  onChange={(e) => setPolicy((s) => ({ ...s, policyType: e.target.value }))}
                  className="input"
                >
                  <option value="">Select type</option>
                  <option value="TERM">Term Life</option>
                  <option value="WHOLE">Whole Life</option>
                  <option value="UNIVERSAL">Universal Life</option>
                  <option value="VARIABLE">Variable Life</option>
                  <option value="GROUP">Group Life</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>
        )}

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
            {loading ? "Creating..." : "Create Client"}
          </Button>
        </div>
      </form>

      {/* Footer Warnings */}
      <div className="mt-12 pt-6 border-t border-slateui-200">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slateui-500">
          <span>Private, voluntary registry</span>
          <span className="text-slateui-300">•</span>
          <span>Not affiliated with insurers or regulators</span>
          <span className="text-slateui-300">•</span>
          <span>Use is voluntary, not required by law</span>
        </div>
      </div>
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
