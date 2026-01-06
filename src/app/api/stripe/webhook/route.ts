import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendEngagementEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeStatus(status: Stripe.Subscription.Status): string {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due") return "past_due";
  if (status === "canceled") return "canceled";
  if (status === "unpaid") return "unpaid";
  if (status === "incomplete" || status === "incomplete_expired") return "incomplete";
  if (status === "paused") return "paused";
  return String(status);
}

async function hasDefaultPaymentMethod(customerId: string): Promise<boolean> {
  const customer = await stripe.customers.retrieve(customerId);
  if ((customer as any).deleted) return false;

  const dpm = (customer as Stripe.Customer).invoice_settings?.default_payment_method;
  if (dpm) return true;

  const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
  return pms.data.length > 0;
}

/**
 * Stripe webhook handler
 * 
 * Handles subscription lifecycle events and updates org billing status
 */
export async function POST(req: Request) {
  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json(
        { ok: false, message: "Missing signature." },
        { status: 400 }
      );
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret);
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, message: `Webhook signature error: ${err?.message}` },
        { status: 400 }
      );
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const orgId = session.metadata?.orgId;
          const engagement = session.metadata?.engagement;
          const customerId = String(session.customer || "");
          const subscriptionId = String(session.subscription || "");

          // Handle client registry (one-time payment)
          if (engagement === "life-insurance-registry") {
            const clientEmail = session.customer_email || session.metadata?.clientEmail;
            const clientName = session.metadata?.clientName || null;

            if (clientEmail) {
              // idempotent upsert
              const registry = await prisma.clientRegistry.upsert({
                where: { stripeCheckoutSessionId: session.id },
                create: {
                  clientEmail,
                  clientName: clientName ?? undefined,
                  stripeCheckoutSessionId: session.id,
                  stripePaymentIntentId: (session.payment_intent as string) || null,
                },
                update: {
                  clientEmail,
                  clientName: clientName ?? undefined,
                  stripePaymentIntentId: (session.payment_intent as string) || null,
                },
              });

              const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
              const uploadLink = `${appUrl}/upload?session_id=${session.id}`;

              await sendEngagementEmail({
                to: clientEmail,
                clientName: clientName ?? undefined,
                uploadLink,
                registryId: registry.id,
              });
            }
          }

          // Handle org subscription (existing logic)
          if (orgId) {
            await prisma.org.update({
              where: { id: orgId },
              data: {
                stripeCustomerId: customerId || undefined,
                stripeSubscriptionId: subscriptionId || undefined,
              },
            });
          }
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = String(sub.customer);
          const subscriptionId = sub.id;

          const org = await prisma.org.findFirst({
            where: { stripeCustomerId: customerId },
            select: { id: true },
          });
          
          if (!org) break;

          const status = normalizeStatus(sub.status);
          const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
          const hasPm = await hasDefaultPaymentMethod(customerId);

          await prisma.org.update({
            where: { id: org.id },
            data: {
              stripeSubscriptionId: subscriptionId,
              stripeSubscriptionStatus: status,
              stripeCurrentPeriodEnd: periodEnd,
              stripeHasPaymentMethod: hasPm,
            },
          });
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = String(invoice.customer || "");
          const org = await prisma.org.findFirst({
            where: { stripeCustomerId: customerId },
            select: { id: true },
          });
          
          if (!org) break;

          await prisma.org.update({
            where: { id: org.id },
            data: { stripeSubscriptionStatus: "past_due" },
          });
          break;
        }

        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = String(invoice.customer || "");
          const org = await prisma.org.findFirst({
            where: { stripeCustomerId: customerId },
            select: { id: true },
          });
          
          if (!org) break;

          await prisma.org.update({
            where: { id: org.id },
            data: { stripeSubscriptionStatus: "active" },
          });
          break;
        }

        default:
          break;
      }

      return NextResponse.json({ ok: true });
    } catch (err: any) {
      console.error("Webhook handler error:", err);
      return NextResponse.json(
        { ok: false, message: err?.message || "Webhook handler error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in webhook route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}
