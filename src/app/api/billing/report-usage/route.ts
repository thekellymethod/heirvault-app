import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BILLABLE_STATUSES = new Set(["trialing", "active", "past_due"]);

/**
 * Report metered usage to Stripe (for registries beyond included limit)
 * 
 * This endpoint should be called by a cron job or scheduled task
 * to report the number of active registries beyond the included limit.
 */
export async function POST(req: Request) {
  try {
    // Protect this endpoint (cron secret header)
    const secret = req.headers.get("x-cron-secret");
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { ok: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const orgId = String(body?.orgId ?? "").trim();
    
    if (!orgId) {
      return NextResponse.json(
        { ok: false, message: "Missing orgId." },
        { status: 400 }
      );
    }

    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        stripeSubscriptionId: true,
        stripeSubscriptionStatus: true,
        includedActiveRegistries: true,
      },
    });

    if (!org?.stripeSubscriptionId) {
      return NextResponse.json(
        { ok: false, message: "No subscription." },
        { status: 400 }
      );
    }

    if (!BILLABLE_STATUSES.has(org.stripeSubscriptionStatus)) {
      return NextResponse.json(
        { ok: false, message: "Subscription not billable." },
        { status: 400 }
      );
    }

    const activeCount = await prisma.registry.count({
      where: { orgId, status: "active" },
    });

    const billable = Math.max(activeCount - org.includedActiveRegistries, 0);

    const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId, {
      expand: ["items.data.price"],
    });

    const meteredPriceId = process.env.STRIPE_PRICE_METERED!;
    const meteredItem = sub.items.data.find((it) => it.price.id === meteredPriceId);

    if (!meteredItem) {
      return NextResponse.json(
        { ok: false, message: "Metered subscription item not found." },
        { status: 500 }
      );
    }

    // Set exact usage quantity (prevents drift/double-count)
    await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
      quantity: billable,
      timestamp: Math.floor(Date.now() / 1000),
      action: "set",
    });

    return NextResponse.json({ ok: true, activeCount, billable });
  } catch (error) {
    console.error("Error in report-usage route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}
