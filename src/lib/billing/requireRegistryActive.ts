// src/lib/billing/requireRegistryActive.ts
import { HttpError } from "@/lib/permissions/guard";
import { isAdminUser } from "@/lib/auth/admin-bypass";

/**
 * Require registry to be active (billing must be active)
 * Admin users bypass this requirement
 */
export async function requireRegistryActive(org: { billingStatus: string | null; currentPeriodEnd: Date | null }) {
  // Admin bypass - admins can perform all operations regardless of billing status
  const isAdmin = await isAdminUser();
  if (isAdmin) {
    return; // Admin override - allow operation
  }

  const active = org.billingStatus === "ACTIVE" || org.billingStatus === "TRIALING";
  
  if (!active) {
    throw new HttpError(402, "Billing required");
  }

  // Check if period has expired
  if (org.currentPeriodEnd && org.currentPeriodEnd < new Date()) {
    throw new HttpError(402, "Billing required");
  }
}

