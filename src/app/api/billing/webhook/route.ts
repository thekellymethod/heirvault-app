// src/app/api/billing/webhook/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
;
import Stripe from "stripe";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const error = err as Error;
    console.error("Webhook signature verification failed:", error.message);
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }

  // Idempotency: check if we've processed this event
  // Using raw SQL since stripe_events table may not be in Prisma schema yet
  try {
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM stripe_events WHERE id = $1`,
      event.id
    );

    if (existing.length > 0) {
      console.log(`Event ${event.id} already processed`);
      return NextResponse.json({ received: true, idempotent: true });
    }

    // Store event for idempotency
    await prisma.$executeRawUnsafe(
      `INSERT INTO stripe_events (id, type, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO NOTHING`,
      event.id,
      event.type
    );
  } catch (err) {
    // If table doesn't exist yet, log and continue (migration will create it)
    const error = err as Error;
    console.warn("stripe_events table may not exist yet:", error.message);
    // Continue processing - idempotency is best-effort until migration runs
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;
        const customerId = session.customer as string | null;
        const customerEmail = session.customer_email || session.customer_details?.email;

        if (!customerId) break;

        // If orgId is in metadata (custom checkout), link directly
        if (orgId) {
          await prisma.organizations.updateMany({
            where: { id: orgId },
            data: {
              stripeCustomerId: customerId,
            },
          });
          break;
        }

        // If no orgId (Buy Button purchase), try to match by email
        if (customerEmail) {
          // Find user by email, then find their organization
          const user = await prisma.user.findFirst({
            where: { email: customerEmail.toLowerCase() },
            select: { id: true },
          });

          if (user) {
            const membership = await prisma.org_members.findFirst({
              where: { userId: user.id },
              select: { organizationId: true },
            });

            if (membership) {
              await prisma.organizations.updateMany({
                where: { id: membership.organizationId },
                data: {
                  stripeCustomerId: customerId,
                },
              });
            }
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // First try to find org by customer ID
        let org = await prisma.organizations.findFirst({
          where: { stripeCustomerId: customerId },
        });

        // If not found (Buy Button purchase), try to match by customer email
        if (!org) {
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !customer.deleted && typeof customer.email === "string") {
              const user = await prisma.user.findFirst({
                where: { email: customer.email.toLowerCase() },
                select: { id: true },
              });

              if (user) {
                const membership = await prisma.org_members.findFirst({
                  where: { userId: user.id },
                  select: { organizationId: true },
                });

                if (membership) {
                  // Link customer to organization
                  await prisma.organizations.updateMany({
                    where: { id: membership.organizationId },
                    data: {
                      stripeCustomerId: customerId,
                    },
                  });

                  // Reload org
                  org = await prisma.organizations.findFirst({
                    where: { id: membership.organizationId },
                  });
                }
              }
            }
          } catch (e) {
            console.error("Failed to retrieve customer or match to org:", e);
          }
        }

        if (!org) break;

        const status = subscription.status === "active" ? "ACTIVE" :
                      subscription.status === "trialing" ? "TRIALING" :
                      subscription.status === "past_due" ? "PAST_DUE" :
                      subscription.status === "canceled" ? "CANCELED" :
                      subscription.status === "unpaid" ? "UNPAID" :
                      "INACTIVE";

        const previousStatus = org.billingStatus;
        const previousPlan = org.billingPlan;
        
        // Determine new plan from price ID
        const priceId = subscription.items.data[0]?.price.id;
        let newPlan: "FREE" | "SOLO" | "SMALL_FIRM" | "ENTERPRISE" = "FREE";
        if (priceId === process.env.STRIPE_PRICE_SOLO) newPlan = "SOLO";
        else if (priceId === process.env.STRIPE_PRICE_SMALL_FIRM) newPlan = "SMALL_FIRM";
        else if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) newPlan = "ENTERPRISE";
        
        await prisma.organizations.update({
          where: { id: org.id },
          data: {
            billingPlan: newPlan,
            stripeSubscriptionId: subscription.id,
            billingStatus: status,
            stripePriceId: priceId ?? null,
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
          },
        });

        // Emit billing events
        const { emitPaymentStatusChangeEvent, emitTierChangeEvent } = await import("@/lib/billing/ledger");
        const { getTierFromBillingPlan } = await import("@/lib/tiers");
        
        // Payment status change
        if (previousStatus !== status) {
          await emitPaymentStatusChangeEvent(
            org.id,
            previousStatus,
            status,
            event.id,
            null // System event
          );
        }
        
        // Tier change (if billing plan changed)
        if (previousPlan !== newPlan) {
          const fromTier = getTierFromBillingPlan(previousPlan);
          const toTier = getTierFromBillingPlan(newPlan);
          await emitTierChangeEvent(
            org.id,
            fromTier,
            toTier,
            `billing_plan_changed_from_${previousPlan}_to_${newPlan}`,
            null // System event
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Try to find org by customer ID (may not exist if Buy Button purchase)
        const org = await prisma.organizations.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!org) {
          // If not found, subscription was likely canceled before org was linked
          // This is okay - we'll handle it gracefully
          console.log(`Subscription deleted for customer ${customerId} but no org found`);
          break;
        }

        const previousStatus = org.billingStatus;
        
        await prisma.organizations.update({
          where: { id: org.id },
          data: {
            billingStatus: "CANCELED",
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
          },
        });

        // Emit billing event for payment status change
        if (previousStatus !== "CANCELED") {
          const { emitPaymentStatusChangeEvent } = await import("@/lib/billing/ledger");
          await emitPaymentStatusChangeEvent(
            org.id,
            previousStatus,
            "CANCELED",
            event.id,
            null // System event
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Try to find org by customer ID
        let org = await prisma.organizations.findFirst({
          where: { stripeCustomerId: customerId },
        });

        // If not found (Buy Button purchase), try to match by email
        if (!org && invoice.customer_email) {
          const user = await prisma.user.findFirst({
            where: { email: invoice.customer_email.toLowerCase() },
            select: { id: true },
          });

          if (user) {
            const membership = await prisma.org_members.findFirst({
              where: { userId: user.id },
              select: { organizationId: true },
            });

            if (membership) {
              await prisma.organizations.updateMany({
                where: { id: membership.organizationId, stripeCustomerId: null },
                data: {
                  stripeCustomerId: customerId,
                },
              });

              org = await prisma.organizations.findFirst({
                where: { id: membership.organizationId },
              });
            }
          }
        }

        if (!org) break;

        // Update status to indicate payment issue
        await prisma.organizations.update({
          where: { id: org.id },
          data: {
            billingStatus: "PAST_DUE",
          },
        });
        break;
      }

      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;

        // Identify org by Stripe customer id
        const customerId = String(inv.customer);
        let org = await prisma.organizations.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });

        // If not found (Buy Button purchase), try to match by customer email
        if (!org && inv.customer_email) {
          const user = await prisma.user.findFirst({
            where: { email: inv.customer_email.toLowerCase() },
            select: { id: true },
          });

          if (user) {
            const membership = await prisma.org_members.findFirst({
              where: { userId: user.id },
              select: { organizationId: true },
            });

            if (membership) {
              // Link customer to organization if not already linked
              await prisma.organizations.updateMany({
                where: { id: membership.organizationId, stripeCustomerId: null },
                data: {
                  stripeCustomerId: customerId,
                },
              });

              org = await prisma.organizations.findFirst({
                where: { id: membership.organizationId },
                select: { id: true },
              });
            }
          }
        }

        if (!org) break;

        // Get the PDF link - Stripe provides invoice_pdf when available
        let pdfUrl = (inv as Stripe.Invoice & { invoice_pdf?: string | null }).invoice_pdf ?? null;

        // If not present on event payload, retrieve invoice to get it
        if (!pdfUrl) {
          try {
            const full = await stripe.invoices.retrieve(inv.id);
            pdfUrl = (full as Stripe.Invoice & { invoice_pdf?: string | null }).invoice_pdf ?? null;
          } catch (e) {
            console.error("Failed to retrieve invoice PDF URL:", e);
            break;
          }
        }

        if (!pdfUrl) {
          // Don't fail the whole webhook; invoice PDF can sometimes be temporarily unavailable
          console.warn(`Invoice ${inv.id} has no PDF URL available`);
          break;
        }

        try {
          // Download the PDF
          const { downloadPdfBuffer } = await import("@/lib/billing/stripeInvoicePdf");
          const pdfBuf = await downloadPdfBuffer(pdfUrl);

          // Stable storage key (idempotent)
          const key = `private/artifacts/billing/${org.id}/invoice-${inv.id}.pdf`;
          const { putObject } = await import("@/lib/storage");
          const { sha256 } = await putObject({ key, body: pdfBuf, contentType: "application/pdf" });

          // Idempotent check - use storageKey to prevent duplicates
          const existing = await prisma.artifacts.findFirst({
            where: { orgId: org.id, type: "BILLING_INVOICE_PDF", storageKey: key },
            select: { id: true },
          });

          if (!existing) {
            await prisma.artifacts.create({
              data: {
                id: crypto.randomUUID(),
                type: "BILLING_INVOICE_PDF",
                orgId: org.id,
                storageKey: key,
                sha256,
                fileName: `invoice-${inv.number || inv.id}.pdf`,
                filePath: key, // Keep for backward compatibility
                fileSize: pdfBuf.length,
                mimeType: "application/pdf",
                metadata: {
                  invoiceId: inv.id,
                  invoiceNumber: inv.number ?? null,
                  hostedInvoiceUrl: (inv as Stripe.Invoice & { hosted_invoice_url?: string | null }).hosted_invoice_url ?? null,
                  amountPaid: inv.amount_paid ?? null,
                  currency: inv.currency ?? null,
                  status: inv.status ?? null,
                  created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
                },
              },
            });
          }
        } catch (e) {
          const error = e as Error;
          console.error(`Failed to archive invoice ${inv.id}:`, error.message);
          // Don't fail the webhook - invoice archival is best-effort
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

