// src/lib/billing/requireRegistryActive.ts
import { HttpError } from "@/lib/permissions/guard";

export function requireRegistryActive(org: { billingStatus: string | null; currentPeriodEnd: Date | null }) {
  const active = org.billingStatus === "ACTIVE" || org.billingStatus === "TRIALING";
  
  if (!active) {
    throw new HttpError(402, "Billing required");
  }

  // Check if period has expired
  if (org.currentPeriodEnd && org.currentPeriodEnd < new Date()) {
    throw new HttpError(402, "Billing required");
  }
}

