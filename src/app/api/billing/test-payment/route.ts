// src/app/api/billing/test-payment/route.ts
// Test endpoint for Stripe payments (uses test mode)
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { getOrgContext } from "@/lib/org/getOrgContext";
import { UserRole } from "@/lib/db/enums";

export async function POST() {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.attorney]);

    const { org, orgId: _orgId } = await getOrgContext(principal);

    // Create or reuse Stripe customer
    const { update: updateOrg } = await import("@/lib/db");
    
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: principal.clerkUserId, // Use a test email
        metadata: { orgId: org.id, testMode: "true" },
      });
      customerId = customer.id;
      await updateOrg("organizations", { id: org.id }, {
        stripeCustomerId: customerId,
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
    }

    // Use test price ID (you'll need to create one in Stripe test mode)
    // For now, we'll use the live price ID but note it's for testing
    const priceId = process.env.STRIPE_PRICE_FIRM;
    if (!priceId) {
      return NextResponse.json({ error: "STRIPE_PRICE_FIRM not configured" }, { status: 500 });
    }

    // Create test checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/billing?test_success=1`,
      cancel_url: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/billing?test_canceled=1`,
      metadata: { orgId: org.id, priceId, testMode: "true" },
      payment_method_types: ["card"],
    });

    return NextResponse.json({ 
      ok: true, 
      url: session.url,
      message: "Use Stripe test card: 4242 4242 4242 4242, any future expiry, any CVC"
    });
  });
}


