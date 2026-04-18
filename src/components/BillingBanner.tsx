// src/components/BillingBanner.tsx
"use client";

import Link from "next/link";
import { useOrgBilling } from "@/hooks/useOrgBilling";
import { useAdminStatus } from "@/hooks/useAdminStatus";

export default function BillingBanner() {
  const { loading, isActive } = useOrgBilling();
  const { loading: adminLoading, isAdmin } = useAdminStatus();

  if (loading || adminLoading) return null;
  if (isActive) return null;

  if (isAdmin) {
    return (
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm leading-snug text-amber-900">
            <span className="font-medium">Administrator.</span>{" "}
            Firm registry billing may still need activation for client invites. Open billing to review or activate.
          </div>
          <Link
            href="/dashboard/billing"
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-center text-sm font-medium text-amber-900 transition hover:bg-amber-100"
          >
            Open billing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm leading-snug text-amber-900">
          <span className="font-medium">Registry inactive.</span>{" "}
          New client registrations and invites are disabled until billing is activated.
        </div>
        <Link
          href="/dashboard/billing"
          className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-center text-sm font-medium text-amber-900 transition hover:bg-amber-100"
        >
          Open billing
        </Link>
      </div>
    </div>
  );
}

