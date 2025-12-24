"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function AttorneyApplyPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [lawFirm, setLawFirm] = React.useState("");
  const [barNumber, setBarNumber] = React.useState("");
  const [licenseState, setLicenseState] = React.useState("");
  const [licenseFile, setLicenseFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Pre-fill from Clerk user if signed in (optional)
  React.useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.emailAddresses?.[0]?.emailAddress || "");
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !barNumber.trim() || !licenseState.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("firstName", firstName.trim());
      formData.append("lastName", lastName.trim());
      formData.append("email", email.trim());
      formData.append("phone", phone.trim());
      formData.append("lawFirm", lawFirm.trim());
      formData.append("barNumber", barNumber.trim());
      formData.append("licenseState", licenseState.trim());
      if (licenseFile) {
        formData.append("licenseDocument", licenseFile);
      }

      const res = await fetch("/api/attorney/apply", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit application");
      }

      setSuccess(true);
      // Show success message - user will be notified when approved
      // They can sign in after admin approval
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // No authentication required - anyone can apply

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-8">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Application Submitted Successfully!</h1>
          <p className="text-slate-600">
            Your attorney application has been submitted and is pending review by an administrator.
          </p>
          <p className="text-sm text-slate-500 mt-2">
            You will receive an email notification once your application has been reviewed. 
            {"After approval, you'll be able to sign in to access the attorney dashboard."}
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push("/")}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Attorney Application</h1>
          <p className="mt-2 text-sm text-slate-600">
            Please provide your information to access the attorney dashboard
          </p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
              className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="lawFirm" className="block text-sm font-medium text-slate-700 mb-1">
              Law Firm / Organization
            </label>
            <input
              id="lawFirm"
              type="text"
              value={lawFirm}
              onChange={(e) => setLawFirm(e.target.value)}
              placeholder="Smith & Associates Law Firm"
              className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="barNumber" className="block text-sm font-medium text-slate-700 mb-1">
                Bar Number <span className="text-red-500">*</span>
              </label>
              <input
                id="barNumber"
                type="text"
                value={barNumber}
                onChange={(e) => setBarNumber(e.target.value)}
                placeholder="e.g., 12345"
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label htmlFor="licenseState" className="block text-sm font-medium text-slate-700 mb-1">
                License State <span className="text-red-500">*</span>
              </label>
              <input
                id="licenseState"
                type="text"
                value={licenseState}
                onChange={(e) => setLicenseState(e.target.value)}
                placeholder="e.g., CA, NY, TX"
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label htmlFor="licenseDocument" className="block text-sm font-medium text-slate-700 mb-1">
              Bar License Document
            </label>
            <input
              id="licenseDocument"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
              className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-slate-500">
              Upload a copy of your bar license (PDF, JPG, or PNG, max 10MB)
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !firstName.trim() || !lastName.trim() || !email.trim() || !barNumber.trim() || !licenseState.trim()}
            className="btn-primary w-full"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}
