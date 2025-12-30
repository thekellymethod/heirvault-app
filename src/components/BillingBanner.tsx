// src/components/BillingBanner.tsx
"use client";

import Link from "next/link";
import { useOrgBilling } from "@/hooks/useOrgBilling";
import { useAdminStatus } from "@/hooks/useAdminStatus";

export default function BillingBanner() {
  const { loading, isActive } = useOrgBilling();
  const { loading: adminLoading, isAdmin } = useAdminStatus();

  if (loading || adminLoading) return null;
  // Admin override: admins bypass billing requirements
  if (isAdmin) return null;
  if (isActive) return null;

  return (
    <div className="border-b bg-amber-50 border-amber-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="text-sm text-amber-900">
          <span className="font-medium">Registry inactive.</span>{" "}
          New client registrations and invites are disabled until billing is activated.
        </div>
        <Link
          href="/dashboard/billing"
          className="text-sm px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 font-medium"
        >
          Activate Registry
        </Link>
      </div>
    </div>
  );
}

