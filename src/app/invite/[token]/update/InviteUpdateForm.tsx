"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, QrCode, CheckCircle } from "lucide-react";

interface Props {
  token: string;
  clientName: string;
}

export function InviteUpdateForm({ token, clientName }: Props) {
  const [updateForm, setUpdateForm] = useState({
    changes: "",
    newFile: null as File | null,
  });
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  async function handleUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!updateForm.changes.trim() && !updateForm.newFile) return;

    setSubmittingUpdate(true);
    setError(null);
    setSuccess(false);

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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit update");
      }

      setSuccess(true);
      setUpdateForm({ changes: "", newFile: null });
      setTimeout(() => setSuccess(false), 5000);
    } catch (e: any) {
      setError(e.message || "Failed to submit update");
    } finally {
      setSubmittingUpdate(false);
    }
  }

  if (success) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-500/10">
          <CheckCircle className="h-8 w-8 text-gold-600" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink-900 mb-2">Update Submitted</h1>
        <p className="text-sm text-slateui-600 mb-6">
          Your update has been submitted successfully. Your attorney will be notified.
        </p>
        <Button
          onClick={() => setSuccess(false)}
          className="btn-primary"
        >
          Submit Another Update
        </Button>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-ink-900">
          Update Your Information
        </h1>
        <p className="mt-2 text-sm text-slateui-600">
          Update your policy information for <span className="font-semibold text-ink-900">{clientName}</span>.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleUpdateSubmit} className="space-y-4">
        <div>
          <label htmlFor="update-changes" className="label mb-1 block">
            Describe Changes
          </label>
          <textarea
            id="update-changes"
            value={updateForm.changes}
            onChange={(e) => setUpdateForm({ ...updateForm, changes: e.target.value })}
            placeholder="Describe the changes you need to make..."
            rows={4}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="update-file" className="label mb-1 block">
            Upload Updated Policy (Optional)
          </label>
          <input
            id="update-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="input"
            onChange={handleUpdateFileUpload}
          />
          {updateForm.newFile && (
            <div className="mt-2 flex items-center gap-2 text-sm text-slateui-600">
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
        </div>
        <Button
          type="submit"
          disabled={submittingUpdate || (!updateForm.changes.trim() && !updateForm.newFile)}
          className="btn-primary w-full"
        >
          {submittingUpdate ? "Submitting..." : "Submit Update"}
        </Button>
      </form>
    </div>
  );
}

