import { NextResponse } from "next/server";
import { requireOrgMember } from "@/lib/authz";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Create Stripe checkout session
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const orgId = String(body?.orgId ?? "").trim();
    
    if (!orgId) {
      return NextResponse.json(
        { ok: false, message: "Missing orgId." },
        { status: 400 }
      );
    }

    await requireOrgMember(orgId);

    const { findUnique: findUniqueOrg, update: updateOrg } = await import("@/lib/db");
    
    type OrgRecord = {
      id: string;
      stripeCustomerId: string | null;
      name: string;
    };
    
    const org = await findUniqueOrg<OrgRecord>("organizations", { id: orgId });
    
    if (!org) {
      return NextResponse.json(
        { ok: false, message: "Org not found." },
        { status: 404 }
      );
    }

    let customerId = org.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { orgId },
      });
      customerId = customer.id;

      await updateOrg("organizations", { id: orgId }, {
        stripeCustomerId: customerId,
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
    }

    const basePrice = process.env.STRIPE_PRICE_BASE!;
    const meteredPrice = process.env.STRIPE_PRICE_METERED!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const successUrl = process.env.STRIPE_SUCCESS_URL ?? `${appUrl}/app/billing/success`;
    const cancelUrl = process.env.STRIPE_CANCEL_URL ?? `${appUrl}/app/billing`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        { price: basePrice, quantity: 1 },
        { price: meteredPrice }, // metered
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      subscription_data: { metadata: { orgId } },
      metadata: { orgId },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    console.error("Error in checkout route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}
