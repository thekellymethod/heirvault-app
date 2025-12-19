import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getCurrentUserWithOrg } from "@/lib/authz";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { user, orgMember } = await getCurrentUserWithOrg();

    if (!user || !orgMember) {
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

    const org = orgMember.organizations;

    // Get or create Stripe customer
    let customerId = org.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          organizationId: org.id,
        },
      });

      customerId = customer.id;

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          stripeCustomerId: customerId,
        },
      });
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
        organizationId: org.id,
        billingPlan,
      },
      subscription_data: {
        metadata: {
          organizationId: org.id,
          billingPlan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

