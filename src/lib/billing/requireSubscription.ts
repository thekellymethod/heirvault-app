// src/lib/billing/requireSubscription.ts
import { prisma } from "@/lib/db";
import { requireAuthPrincipal } from "@/lib/permissions/guard";
import { HttpError } from "@/lib/permissions/guard";
import { redirect } from "next/navigation";

export async function requireOrgSubscription() {
  const principal = await requireAuthPrincipal();

  // Resolve org membership
  const membership = await prisma.org_members.findFirst({
    where: { userId: principal.dbUserId },
    include: { organizations: true },
  });

  if (!membership) {
    throw new HttpError(403, "No organization found");
  }

  const org = membership.organizations;

  // Check subscription status
  if (org.billingStatus !== "ACTIVE" && org.billingStatus !== "TRIALING") {
    // Redirect to billing page
    redirect("/dashboard/billing");
  }

  return { principal, org };
}

