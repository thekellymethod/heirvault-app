// src/lib/billing/requireActiveSubscription.ts
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/permissions/guard";

export async function requireActiveSubscription(orgId: string) {
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

