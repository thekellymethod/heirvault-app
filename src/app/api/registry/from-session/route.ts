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

  const registry = await prisma.clientRegistry.upsert({
    where: { stripeCheckoutSessionId: session.id },
    create: {
      clientEmail,
      clientName: session.metadata?.clientName || null,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: (session.payment_intent as string) || null,
    },
    update: {},
  });

  return NextResponse.json({ registryId: registry.id });
}
