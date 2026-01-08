import { NextResponse } from "next/server";
import Stripe from "stripe";
;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return new NextResponse("Webhook not configured", { status: 500 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const _errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;

    const customerId = subscription.customer as string;

    const { findMany: findManyOrgs, update: updateOrg } = await import("@/lib/db");
    
    // Look up org by stripe_customer_id
    const orgs = await findManyOrgs("organizations", {
      where: { stripeCustomerId: customerId },
      limit: 1,
    });

    const org = orgs && orgs.length > 0 ? (orgs[0] as { id: string }) : null;
    if (!org) {
      console.warn("No organization found for customer", customerId);
      return new NextResponse("OK", { status: 200 });
    }

    // Determine plan from subscription
    const priceId = subscription.items.data[0]?.price.id;
    let plan: "FREE" | "SOLO" | "SMALL_FIRM" | "ENTERPRISE" = "FREE";

    if (priceId === process.env.STRIPE_PRICE_SOLO) plan = "SOLO";
    else if (priceId === process.env.STRIPE_PRICE_SMALL_FIRM) plan = "SMALL_FIRM";

    const status = subscription.status; // "active", "past_due", etc.

    await updateOrg("organizations", { id: org.id }, {
      billingPlan: plan,
      stripeSubscriptionId: subscription.id,
      billingStatus: status,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);
  }

  return new NextResponse("OK", { status: 200 });
}
