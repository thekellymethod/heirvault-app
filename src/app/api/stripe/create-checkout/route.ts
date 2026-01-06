import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const { clientName, clientEmail } = await req.json();

  if (!clientEmail) {
    return new NextResponse("Missing clientEmail", { status: 400 });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: clientEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "HeirVault – Life Insurance Policy Registry",
            description:
              "One-time engagement: identify, organize, and register life insurance policies with controlled access.",
          },
          unit_amount: 75000,
        },
        quantity: 1,
      },
    ],
    metadata: {
      clientName: clientName || "",
      clientEmail,
      engagement: "life-insurance-registry",
    },
    success_url: `${origin}/upload?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/billing?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
