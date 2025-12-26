"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";

// import whatever UI components you use...
// import { Button } from "@/components/ui/button";

export default function PolicyBeneficiariesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  // If you had: const { id } = useParams(); this is equivalent:
  const policyId = params?.id;

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ...your other useState calls

  const load = React.useCallback(async () => {
    if (!policyId) return;
    setLoading(true);
    setError(null);

    try {
      // fetch stuff
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [policyId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* your JSX */}
      {/* example */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Policy Beneficiaries</h1>
        <button
          type="button"
          onClick={() => router.push("/dashboard/policies")}
          className="btn-secondary"
        >
          Back
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* rest of page */}
    </div>
  );
}
