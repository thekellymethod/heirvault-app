"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";

export default function BaseTierContractPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [hasAuthority, setHasAuthority] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isLoaded && !user) {
      router.push("/attorney/sign-in");
    }
  }, [user, isLoaded, router]);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasAuthority) {
      setError("You must confirm you have authority to bind the firm");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contracts/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "BASE",
          hasAuthority: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept contract");
      }

      // Success - redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center mb-6">
          <Logo size="lg" showTagline={false} className="flex-row mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Base Tier Service Agreement</h1>
          <p className="mt-2 text-sm text-slate-600">
            Please review and accept the terms to continue
          </p>
        </div>

        <div className="card p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Contract Terms */}
          <div className="space-y-4 text-sm text-slate-700">
            <section>
              <h2 className="font-semibold text-base text-slate-900 mb-2">1. Service Description</h2>
              <p className="mb-2">
                HeirVault provides a secure registry service for life insurance policy information and beneficiary designations. 
                The Base Tier includes basic registry operations with limited estate management capabilities.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-base text-slate-900 mb-2">2. Base Tier Limitations</h2>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Maximum of 1 active estate</li>
                <li>No access to client data beyond registry entries</li>
                <li>No restricted document uploads</li>
                <li>No global policy search</li>
                <li>No API token access</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-base text-slate-900 mb-2">3. Data Security & Privacy</h2>
              <p className="mb-2">
                All data is encrypted at rest and in transit. We maintain industry-standard security practices 
                and comply with applicable privacy regulations including GDPR and state-specific requirements.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-base text-slate-900 mb-2">4. Billing & Payment</h2>
              <p className="mb-2">
                Base Tier may be free or subject to billing based on your organization's plan. 
                You will be notified of any charges before they are applied.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-base text-slate-900 mb-2">5. Termination</h2>
              <p className="mb-2">
                Either party may terminate this agreement at any time. Upon termination, 
                you may export your data for 30 days before it is permanently deleted.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-base text-slate-900 mb-2">6. Governing Law</h2>
              <p className="mb-2">
                This agreement is governed by the laws of the jurisdiction in which your firm operates, 
                as specified during onboarding.
              </p>
            </section>
          </div>
        </div>

        <form onSubmit={handleAccept} className="card p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-start space-x-3">
            <input
              id="hasAuthority"
              type="checkbox"
              checked={hasAuthority}
              onChange={(e) => setHasAuthority(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              required
              disabled={submitting}
            />
            <label htmlFor="hasAuthority" className="text-sm text-slate-700">
              <span className="font-medium">I confirm that I have authority to bind my firm or organization to this agreement.</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <input
              id="acceptTerms"
              type="checkbox"
              defaultChecked
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              required
              disabled={submitting}
            />
            <label htmlFor="acceptTerms" className="text-sm text-slate-700">
              I have read and accept the Base Tier Service Agreement terms and conditions.
              <span className="text-red-500 ml-1">*</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || !hasAuthority}
            className="btn-primary w-full"
          >
            {submitting ? "Accepting..." : "Accept & Continue to Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
