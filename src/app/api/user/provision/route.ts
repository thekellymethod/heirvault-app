import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: Request): Promise<Response> {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(
      JSON.stringify({ error: "Missing Stripe signature" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const rawBody = await req.text();

  let _event: Stripe.Event;

  try {
    _event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Stripe webhook error";

    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ---- HANDLE EVENTS HERE ----
  // switch (event.type) {
  //   case "checkout.session.completed":
  //     break;
  //   case "customer.subscription.updated":
  //     break;
  // }

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
