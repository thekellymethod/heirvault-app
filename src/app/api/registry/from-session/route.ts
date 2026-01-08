import { NextResponse } from "next/server";
// Prisma removed - database access needs to be implemented
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const { sessionId } = await req.json();
  if (!sessionId) return new NextResponse("Missing sessionId", { status: 400 });

  // Verify session exists & is paid
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return new NextResponse("Payment not confirmed", { status: 403 });
  }

  // Registry created by webhook; but in case webhook lags, create now idempotently
  const clientEmail = session.customer_email || session.metadata?.clientEmail;
  if (!clientEmail) return new NextResponse("Missing customer email", { status: 400 });

  const { upsert: upsertRegistry, findUnique: findUniqueRegistry } = await import("@/lib/db");
  const { randomUUID } = await import("crypto");
  
  // Check if registry exists
  const existing = await findUniqueRegistry("client_registries", { stripeCheckoutSessionId: session.id });
  
  let registry;
  if (existing) {
    registry = existing;
  } else {
    registry = await upsertRegistry("client_registries", {
      id: randomUUID(),
      clientEmail,
      clientName: session.metadata?.clientName || null,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: (session.payment_intent as string) || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>, {
      where: { stripeCheckoutSessionId: session.id },
    });
  }

  return NextResponse.json({ registryId: registry.id });
}
