import { NextResponse } from "next/server";
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

    const { findUnique: findUniqueOrg, count: countRegistries } = await import("@/lib/db");
    
    type OrgRecord = {
      id: string;
      stripeSubscriptionId: string | null;
      stripeSubscriptionStatus: string | null;
      includedActiveRegistries: number;
    };
    
    const org = await findUniqueOrg<OrgRecord>("organizations", { id: orgId });

    if (!org?.stripeSubscriptionId) {
      return NextResponse.json(
        { ok: false, message: "No subscription." },
        { status: 400 }
      );
    }

    if (!org.stripeSubscriptionStatus || !BILLABLE_STATUSES.has(org.stripeSubscriptionStatus)) {
      return NextResponse.json(
        { ok: false, message: "Subscription not billable." },
        { status: 400 }
      );
    }

    const activeCount = await countRegistries("registries", {
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
    await (stripe.subscriptionItems as any).createUsageRecord(meteredItem.id, {
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
