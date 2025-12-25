"use client";

import { useState } from "react";
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

interface UpdateFormProps {
  token: string,
  currentData?: Record<string, unknown>;
  registryId: string,
}

/**
 * Update Form Component
 * 
 * Client component that posts to /api/records with token.
 * Allows users to submit updates to their registry.
 * All changes create new versions (immutable).
 */
export function UpdateForm({ token, currentData }: UpdateFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Form state - pre-fill with current data
  const [formData, setFormData] = useState({
    policyholder_name: (currentData?.policyholderName || currentData?.policyholder_name) as string || "",
    insured_name: (currentData?.insuredName || currentData?.insured_name) as string || "",
    beneficiary_name: (currentData?.beneficiaryName || currentData?.beneficiary_name) as string || "",
    carrier_guess: (currentData?.carrierGuess || currentData?.carrier_guess) as string || "",
    policy_number_optional: (currentData?.policyNumber || currentData?.policy_number_optional) as string || "",
    notes_optional: (currentData?.notes || currentData?.notes_optional) as string || "",
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

    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setError("File size must be less than 15MB");
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
      submitData.append("token", token);
      submitData.append("policyholder_name", formData.policyholder_name);
      submitData.append("insured_name", formData.insured_name);
      submitData.append("beneficiary_name", formData.beneficiary_name);
      submitData.append("carrier_guess", formData.carrier_guess);
      
      if (formData.policy_number_optional) {
        submitData.append("policy_number_optional", formData.policy_number_optional);
      }
      
      if (formData.notes_optional) {
        submitData.append("notes_optional", formData.notes_optional);
      }

      if (uploadedFile) {
        submitData.append("document", uploadedFile);
      }

      const res = await fetch("/api/records", {
        method: "POST",
        body: submitData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to submit update");

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        
        <h2 className="font-display text-xl font-bold text-ink-900 mb-3">
          Update Submitted Successfully
        </h2>
        
        <p className="text-slateui-600 mb-6">
          Your changes have been recorded as a new version. All previous versions remain intact.
        </p>

        <Button
          onClick={() => {
            window.location.reload();
          }}
          className="btn-primary"
        >
          Submit Another Update
        </Button>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-lg font-semibold text-ink-900 mb-4">
        Update Information
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Document Upload Section */}
        <div>
          <h3 className="font-display text-md font-semibold text-ink-900 mb-3 flex items-center gap-2">
            <Upload className="h-4 w-4 text-gold-500" />
            Upload New Document (Optional)
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label
                htmlFor="file-upload"
                className="flex-1 cursor-pointer rounded-lg border-2 border-dashed border-slateui-300 p-4 text-center hover:border-gold-500 transition-colors"
              >
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-slateui-400" />
                  <span className="text-xs font-medium text-slateui-600">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-slateui-500">
                    PDF, JPEG, or PNG (max 15MB)
                  </span>
                </div>
              </label>
            </div>

            {uploadedFile && (
              <div className="flex items-center justify-between rounded-lg bg-slateui-50 p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slateui-500" />
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
        <div className="space-y-4">
          <div>
            <label htmlFor="policyholder_name" className="block text-sm font-medium text-ink-900 mb-1">
              Policyholder Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="policyholder_name"
              type="text"
              required
              value={formData.policyholder_name}
              onChange={(e) => setFormData({ ...formData, policyholder_name: e.target.value })}
              placeholder="Full name of policyholder"
            />
          </div>

          <div>
            <label htmlFor="insured_name" className="block text-sm font-medium text-ink-900 mb-1">
              Insured Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="insured_name"
              type="text"
              required
              value={formData.insured_name}
              onChange={(e) => setFormData({ ...formData, insured_name: e.target.value })}
              placeholder="Full name of insured person"
            />
          </div>

          <div>
            <label htmlFor="beneficiary_name" className="block text-sm font-medium text-ink-900 mb-1">
              Beneficiary Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="beneficiary_name"
              type="text"
              required
              value={formData.beneficiary_name}
              onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })}
              placeholder="Full name of beneficiary"
            />
          </div>

          <div>
            <label htmlFor="carrier_guess" className="block text-sm font-medium text-ink-900 mb-1">
              Insurance Carrier <span className="text-red-500">*</span>
            </label>
            <Input
              id="carrier_guess"
              type="text"
              required
              value={formData.carrier_guess}
              onChange={(e) => setFormData({ ...formData, carrier_guess: e.target.value })}
              placeholder="Name of insurance company"
            />
          </div>

          <div>
            <label htmlFor="policy_number_optional" className="block text-sm font-medium text-ink-900 mb-1">
              Policy Number (Optional)
            </label>
            <Input
              id="policy_number_optional"
              type="text"
              value={formData.policy_number_optional}
              onChange={(e) => setFormData({ ...formData, policy_number_optional: e.target.value })}
              placeholder="Policy number if available"
            />
          </div>

          <div>
            <label htmlFor="notes_optional" className="block text-sm font-medium text-ink-900 mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="notes_optional"
              rows={4}
              value={formData.notes_optional}
              onChange={(e) => setFormData({ ...formData, notes_optional: e.target.value })}
              placeholder="Additional information or notes"
              className="flex w-full rounded-md border border-slateui-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-slateui-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !formData.policyholder_name || !formData.insured_name || !formData.beneficiary_name || !formData.carrier_guess}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Update"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
