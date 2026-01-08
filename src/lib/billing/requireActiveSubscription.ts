// src/lib/billing/requireActiveSubscription.ts
;
import { HttpError } from "@/lib/permissions/guard";
import { isAdminUser } from "@/lib/auth/admin-bypass";

/**
 * Require active subscription for an organization
 * Admin users bypass this requirement
 */
export async function requireActiveSubscription(orgId: string) {
  // Admin bypass - admins can perform all operations regardless of billing status
  const isAdmin = await isAdminUser();
  if (isAdmin) {
    return; // Admin override - allow operation
  }

  const { findUnique } = await import("@/lib/db");
  
  type OrganizationRecord = {
    id: string;
    billingStatus: string;
    currentPeriodEnd: string | null;
  };
  
  const org = await findUnique<OrganizationRecord>("organizations", { id: orgId });

  if (!org) {
    throw new HttpError(403, "Organization not found");
  }

  // Check subscription status - ACTIVE or TRIALING are allowed
  if (org.billingStatus !== "ACTIVE" && org.billingStatus !== "TRIALING") {
    throw new HttpError(402, "Billing required");
  }

  // Optional grace check if period has expired
  if (org.currentPeriodEnd) {
    const periodEnd = new Date(org.currentPeriodEnd);
    if (periodEnd < new Date()) {
      throw new HttpError(402, "Subscription expired");
    }
  }
}

