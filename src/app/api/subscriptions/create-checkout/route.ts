import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getCurrentUserWithOrg } from "@/lib/authz";

export async function POST(req: NextRequest) {
  try {
    const { user, org } = await getCurrentUserWithOrg();

    if (!user || !org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { billingPlan } = body; // "SOLO" or "SMALL_FIRM"

    if (!billingPlan || !["SOLO", "SMALL_FIRM"].includes(billingPlan)) {
      return NextResponse.json(
        { error: "Invalid billing plan" },
        { status: 400 }
      );
    }

    // Fetch full organization record to get stripeCustomerId
    const { findUnique: findUniqueOrg } = await import("@/lib/db");
    type OrgRecord = { id: string; name: string; stripeCustomerId: string | null };
    const fullOrg = await findUniqueOrg<OrgRecord>("organizations", { id: org.id });
    
    if (!fullOrg) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = fullOrg.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: fullOrg.name,
        metadata: {
          organizationId: fullOrg.id,
        },
      });

      customerId = customer.id;

      const { update: updateOrg } = await import("@/lib/db");
      await updateOrg("organizations", { id: fullOrg.id }, {
        stripeCustomerId: customerId,
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
    }

    // Determine price ID based on billing plan
    // You'll need to set these in your Stripe dashboard and add to env vars
    const priceId =
      billingPlan === "SOLO"
        ? process.env.STRIPE_PRICE_ID_SOLO
        : process.env.STRIPE_PRICE_ID_SMALL_FIRM;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID not configured for this plan" },
        { status: 500 }
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?canceled=true`,
      metadata: {
        organizationId: fullOrg.id,
        billingPlan,
      },
      subscription_data: {
        metadata: {
          organizationId: fullOrg.id,
          billingPlan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

