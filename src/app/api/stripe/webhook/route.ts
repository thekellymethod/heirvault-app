import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
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
              const { findUnique: findUniqueRegistry, create: createRegistry, update: updateRegistry } = await import("@/lib/db");
              const { randomUUID } = await import("crypto");
              
              // idempotent upsert
              const existing = await findUniqueRegistry("client_registries", { stripeCheckoutSessionId: session.id });
              const now = new Date().toISOString();
              
              const registry = existing
                ? await updateRegistry("client_registries", { id: existing.id }, {
                    clientEmail,
                    clientName: clientName ?? null,
                    stripePaymentIntentId: (session.payment_intent as string) || null,
                    updatedAt: now,
                  } as Record<string, unknown>)
                : await createRegistry("client_registries", {
                    id: randomUUID(),
                    clientEmail,
                    clientName: clientName ?? null,
                    stripeCheckoutSessionId: session.id,
                    stripePaymentIntentId: (session.payment_intent as string) || null,
                    createdAt: now,
                    updatedAt: now,
                  } as Record<string, unknown>) as { id: string };

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
            const { update: updateOrg } = await import("@/lib/db");
            await updateOrg("organizations", { id: orgId }, {
              stripeCustomerId: customerId || null,
              stripeSubscriptionId: subscriptionId || null,
              updatedAt: new Date().toISOString(),
            } as Record<string, unknown>);
          }
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = String(sub.customer);
          const subscriptionId = sub.id;

          const { findMany: findManyOrgs, update: updateOrg } = await import("@/lib/db");
          
          const orgs = await findManyOrgs("organizations", {
            where: { stripeCustomerId: customerId },
            limit: 1,
          });
          
          const org = orgs && orgs.length > 0 ? (orgs[0] as { id: string }) : null;
          if (!org) break;

          const status = normalizeStatus(sub.status);
          const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
          const hasPm = await hasDefaultPaymentMethod(customerId);

          await updateOrg("organizations", { id: org.id }, {
            stripeSubscriptionId: subscriptionId,
            stripeSubscriptionStatus: status,
            stripeCurrentPeriodEnd: periodEnd,
            stripeHasPaymentMethod: hasPm,
            updatedAt: new Date().toISOString(),
          } as Record<string, unknown>);
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = String(invoice.customer || "");
          const { findMany: findManyOrgs, update: updateOrg } = await import("@/lib/db");
          
          const orgs = await findManyOrgs("organizations", {
            where: { stripeCustomerId: customerId },
            limit: 1,
          });
          
          const org = orgs && orgs.length > 0 ? (orgs[0] as { id: string }) : null;
          if (!org) break;

          await updateOrg("organizations", { id: org.id }, {
            stripeSubscriptionStatus: "past_due",
            updatedAt: new Date().toISOString(),
          } as Record<string, unknown>);
          break;
        }

        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = String(invoice.customer || "");
          const { findMany: findManyOrgs, update: updateOrg } = await import("@/lib/db");
          
          const orgs = await findManyOrgs("organizations", {
            where: { stripeCustomerId: customerId },
            limit: 1,
          });
          
          const org = orgs && orgs.length > 0 ? (orgs[0] as { id: string }) : null;
          if (!org) break;

          await updateOrg("organizations", { id: org.id }, {
            stripeSubscriptionStatus: "active",
            updatedAt: new Date().toISOString(),
          } as Record<string, unknown>);
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
