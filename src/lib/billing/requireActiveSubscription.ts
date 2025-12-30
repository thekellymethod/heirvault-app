// src/lib/billing/requireActiveSubscription.ts
import { prisma } from "@/lib/db";
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

  const org = await prisma.organizations.findUnique({
    where: { id: orgId },
    select: {
      billingStatus: true,
      currentPeriodEnd: true,
    },
  });

  if (!org) {
    throw new HttpError(403, "Organization not found");
  }

  // Check subscription status - ACTIVE or TRIALING are allowed
  if (org.billingStatus !== "ACTIVE" && org.billingStatus !== "TRIALING") {
    throw new HttpError(402, "Billing required");
  }

  // Optional grace check if period has expired
  if (org.currentPeriodEnd && org.currentPeriodEnd < new Date()) {
    throw new HttpError(402, "Subscription expired");
  }
}

