import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export const STRIPE_PRICE_SOLO = process.env.STRIPE_PRICE_SOLO || "19.99";
export const STRIPE_PRICE_SMALL_FIRM = process.env.STRIPE_PRICE_SMALL_FIRM || "69.99";

