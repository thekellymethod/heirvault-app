import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMember } from "@/lib/authz";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Create Stripe customer portal session
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const orgId = String(body?.orgId ?? "").trim();
    const returnTo = String(body?.returnTo ?? "/app/billing");

    if (!orgId) {
      return NextResponse.json(
        { ok: false, message: "Missing orgId." },
        { status: 400 }
      );
    }

    await requireOrgMember(orgId);

    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { stripeCustomerId: true },
    });

    if (!org?.stripeCustomerId) {
      return NextResponse.json(
        { ok: false, message: "No Stripe customer on file." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const portal = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: returnTo.startsWith("http") ? returnTo : `${appUrl}${returnTo}`,
    });

    return NextResponse.json({ ok: true, url: portal.url });
  } catch (error) {
    console.error("Error in portal route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}
