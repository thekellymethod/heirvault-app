// src/app/api/billing/webhook/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
;
import Stripe from "stripe";
import crypto from "crypto";
import { organizationIdFromMemberRow } from "@/lib/org/membershipRow";

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
    const { queryRaw, getDb } = await import("@/lib/db");
    const existing = await queryRaw<Array<{ id: string }>>(
      `SELECT id FROM stripe_events WHERE id = $1`,
      [event.id]
    );

    if (existing.length > 0) {
      console.log(`Event ${event.id} already processed`);
      return NextResponse.json({ received: true, idempotent: true });
    }

    // Store event for idempotency
    const db = getDb();
    await db.from("stripe_events").insert({
      id: event.id,
      type: event.type,
      created_at: new Date().toISOString(),
    }).select().single();
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
          const { update: updateOrg } = await import("@/lib/db");
          await updateOrg("organizations", { id: orgId }, {
            stripeCustomerId: customerId,
            updatedAt: new Date().toISOString(),
          } as Record<string, unknown>);
          break;
        }

        // If no orgId (Buy Button purchase), try to match by email
        if (customerEmail) {
          const { findMany: findManyUsers, findMany: findManyMembers, update: updateOrg, getDb } = await import("@/lib/db");
          const db = getDb();
          
          // Find user by email, then find their organization
          const { data: usersData } = await db
            .from("users")
            .select("id")
            .ilike("email", customerEmail.toLowerCase())
            .limit(1);

          if (usersData && usersData.length > 0) {
            const user = usersData[0];
            const members = await findManyMembers("org_members", {
              where: { userId: user.id },
              limit: 1,
            });

            if (members && members.length > 0) {
              const oid = organizationIdFromMemberRow(members[0] as Record<string, unknown>);
              if (oid) {
                await updateOrg("organizations", { id: oid }, {
                  stripeCustomerId: customerId,
                  updatedAt: new Date().toISOString(),
                } as Record<string, unknown>);
              }
            }
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { findUnique: findUniqueOrg, findMany: findManyMembers, update: updateOrg, getDb } = await import("@/lib/db");
        
        type OrgRecord = {
          id: string;
          billingStatus: string | null;
          billingPlan: string | null;
        };
        
        // First try to find org by customer ID
        const db = getDb();
        const { data: orgsData } = await db
          .from("organizations")
          .select("*")
          .eq("stripeCustomerId", customerId)
          .limit(1);
        
        let org: OrgRecord | null = orgsData && orgsData.length > 0 ? (orgsData[0] as OrgRecord) : null;

        // If not found (Buy Button purchase), try to match by customer email
        if (!org) {
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !customer.deleted && typeof customer.email === "string") {
              const { data: usersData } = await db
                .from("users")
                .select("id")
                .ilike("email", customer.email.toLowerCase())
                .limit(1);

              if (usersData && usersData.length > 0) {
                const user = usersData[0];
                const members = await findManyMembers("org_members", {
                  where: { userId: user.id },
                  limit: 1,
                });

                if (members && members.length > 0) {
                  const oid = organizationIdFromMemberRow(members[0] as Record<string, unknown>);
                  if (oid) {
                    await updateOrg("organizations", { id: oid }, {
                      stripeCustomerId: customerId,
                      updatedAt: new Date().toISOString(),
                    } as Record<string, unknown>);

                    const reloaded = await findUniqueOrg<OrgRecord>("organizations", { id: oid });
                    org = reloaded;
                  }
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
        
        await updateOrg("organizations", { id: org.id }, {
          billingPlan: newPlan,
          stripeSubscriptionId: subscription.id,
          billingStatus: status,
          stripePriceId: priceId ?? null,
          currentPeriodEnd: (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end
            ? new Date((subscription as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000).toISOString()
            : null,
          updatedAt: new Date().toISOString(),
        } as Record<string, unknown>);

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
        if (previousPlan && previousPlan !== newPlan) {
          const fromTier = getTierFromBillingPlan(previousPlan as string);
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

        const { getDb, update: updateOrg } = await import("@/lib/db");
        const db = getDb();
        
        // Try to find org by customer ID (may not exist if Buy Button purchase)
        const { data: orgsData } = await db
          .from("organizations")
          .select("*")
          .eq("stripeCustomerId", customerId)
          .limit(1);
        
        type OrgRecord = {
          id: string;
          billingStatus: string | null;
        };
        
        const org: OrgRecord | null = orgsData && orgsData.length > 0 ? (orgsData[0] as OrgRecord) : null;

        if (!org) {
          // If not found, subscription was likely canceled before org was linked
          // This is okay - we'll handle it gracefully
          console.log(`Subscription deleted for customer ${customerId} but no org found`);
          break;
        }

        const previousStatus = org.billingStatus;
        
        await updateOrg("organizations", { id: org.id }, {
          billingStatus: "CANCELED",
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
          updatedAt: new Date().toISOString(),
        } as Record<string, unknown>);

        // Emit billing event for payment status change
        if (previousStatus && previousStatus !== "CANCELED") {
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

        const { getDb, findMany: findManyMembers, update: updateOrg } = await import("@/lib/db");
        const db = getDb();
        
        type OrgRecord = {
          id: string;
        };
        
        // Try to find org by customer ID
        const { data: orgsData } = await db
          .from("organizations")
          .select("*")
          .eq("stripeCustomerId", customerId)
          .limit(1);
        
        let org: OrgRecord | null = orgsData && orgsData.length > 0 ? (orgsData[0] as OrgRecord) : null;

        // If not found (Buy Button purchase), try to match by email
        if (!org && invoice.customer_email) {
          const { data: usersData } = await db
            .from("users")
            .select("id")
            .ilike("email", invoice.customer_email.toLowerCase())
            .limit(1);

          if (usersData && usersData.length > 0) {
            const user = usersData[0];
            const members = await findManyMembers("org_members", {
              where: { userId: user.id },
              limit: 1,
            });

            if (members && members.length > 0) {
              const oid = organizationIdFromMemberRow(members[0] as Record<string, unknown>);
              if (oid) {
                await updateOrg("organizations", { id: oid }, {
                  stripeCustomerId: customerId,
                  updatedAt: new Date().toISOString(),
                } as Record<string, unknown>);

                const reloaded = await db
                  .from("organizations")
                  .select("*")
                  .eq("id", oid)
                  .limit(1)
                  .single();

                org = reloaded.data as OrgRecord | null;
              }
            }
          }
        }

        if (!org) break;

        // Update status to indicate payment issue
        await updateOrg("organizations", { id: org.id }, {
          billingStatus: "PAST_DUE",
          updatedAt: new Date().toISOString(),
        } as Record<string, unknown>);
        break;
      }

      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;

        const { getDb, findMany: findManyMembers, update: updateOrg } = await import("@/lib/db");
        const db = getDb();
        
        // Identify org by Stripe customer id
        const customerId = String(inv.customer);
        
        type OrgRecord = {
          id: string;
        };
        
        const { data: orgsData } = await db
          .from("organizations")
          .select("id")
          .eq("stripeCustomerId", customerId)
          .limit(1);
        
        let org: OrgRecord | null = orgsData && orgsData.length > 0 ? (orgsData[0] as OrgRecord) : null;

        // If not found (Buy Button purchase), try to match by customer email
        if (!org && inv.customer_email) {
          const { data: usersData } = await db
            .from("users")
            .select("id")
            .ilike("email", inv.customer_email.toLowerCase())
            .limit(1);

          if (usersData && usersData.length > 0) {
            const user = usersData[0];
            const members = await findManyMembers("org_members", {
              where: { userId: user.id },
              limit: 1,
            });

            if (members && members.length > 0) {
              const oid = organizationIdFromMemberRow(members[0] as Record<string, unknown>);
              if (oid) {
                await updateOrg("organizations", { id: oid }, {
                  stripeCustomerId: customerId,
                  updatedAt: new Date().toISOString(),
                } as Record<string, unknown>);

                const reloaded = await db
                  .from("organizations")
                  .select("id")
                  .eq("id", oid)
                  .limit(1)
                  .single();

                org = reloaded.data as OrgRecord | null;
              }
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
          const { findMany: findManyArtifacts, create: createArtifact } = await import("@/lib/db");
          const { randomUUID } = await import("crypto");
          
          const existing = await findManyArtifacts("artifacts", {
            where: { orgId: org.id, type: "BILLING_INVOICE_PDF", storageKey: key },
            limit: 1,
          });

          if (!existing || existing.length === 0) {
            await createArtifact("artifacts", {
              id: randomUUID(),
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
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as Record<string, unknown>);
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

