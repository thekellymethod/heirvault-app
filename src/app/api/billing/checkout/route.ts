// src/app/api/billing/checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal } from "@/lib/permissions/guard";

export async function POST() {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();

    // Resolve org membership
    const membership = await prisma.org_members.findFirst({
      where: { userId: principal.dbUserId },
      include: { organizations: true },
    });

    if (!membership) {
      throw new Error("No organization found");
    }

    const org = membership.organizations;

    // If already active, send them to portal instead
    if (org.billingStatus === "ACTIVE" && org.stripeCustomerId) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: org.stripeCustomerId,
        return_url: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/billing`,
      });
      return { ok: true, url: portal.url, mode: "portal" };
    }

    // Create or reuse Stripe customer
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { orgId: org.id },
      });
      customerId = customer.id;
      await prisma.organizations.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const priceId = process.env.STRIPE_PRICE_FIRM;
    if (!priceId) {
      throw new Error("STRIPE_PRICE_FIRM not configured");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/billing?success=1`,
      cancel_url: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/billing?canceled=1`,
      metadata: { orgId: org.id, priceId },
      allow_promotion_codes: true,
    });

    return { ok: true, url: session.url, mode: "checkout" };
  });
}
