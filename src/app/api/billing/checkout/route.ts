import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-11-17.clover" as Stripe.LatestApiVersion,
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { plan } = body as { plan: "SOLO" | "SMALL_FIRM" };

  if (!plan) {
    return new NextResponse("Plan required", { status: 400 });
  }

  const priceId =
    plan === "SOLO"
      ? process.env.STRIPE_PRICE_SOLO
      : process.env.STRIPE_PRICE_SMALL_FIRM;

  if (!priceId) {
    return new NextResponse("Price configuration missing", { status: 500 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      org_members: {
        include: {
          organizations: true,
        },
      },
    },
  });

  const orgMember = user?.org_members?.[0];
  if (!user || !orgMember) {
    return new NextResponse("No organization found", { status: 400 });
  }

  const org = orgMember.organizations;

  // Ensure Stripe customer
  let customerId = org.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      metadata: {
        organizationId: org.id,
      },
    });

    customerId = customer.id;

    await prisma.organizations.update({
      where: { id: org.id },
      data: {
        stripe_customer_id: customerId,
      },
    });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/billing?status=success`,
    cancel_url: `${baseUrl}/dashboard/billing?status=cancelled`,
    metadata: {
      organizationId: org.id,
      plan,
    },
  });

  return NextResponse.json({ url: session.url }, { status: 201 });
}

