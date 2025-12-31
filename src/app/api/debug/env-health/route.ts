// src/app/api/debug/env-health/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Debug endpoint to check environment configuration
 * Safely prints which database it's connected to, Accelerate status, etc.
 * Helps verify environment variables are set correctly
 * Only available in development mode
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    // Database fingerprint (last 8 chars of connection string host)
    const dbUrl = process.env.DATABASE_URL || "";
    const accelerateUrl = process.env.PRISMA_ACCELERATE_URL || "";

    // Extract host from connection strings (safely, without exposing full credentials)
    const getDbFingerprint = (url: string) => {
      if (!url) return null;
      try {
        const match = url.match(/@([^:]+)/);
        return match ? match[1].substring(0, 20) + "..." : "invalid";
      } catch {
        return "parse_error";
      }
    };

    // Check if Accelerate URL is valid format
    const accelerateValid = accelerateUrl.startsWith("prisma://");
    const accelerateConfigured = !!accelerateUrl;

    // Check Clerk keys
    const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
    const clerkSecretKey = process.env.CLERK_SECRET_KEY || "";
    const clerkConfigured = !!(clerkPublishableKey && clerkSecretKey);
    const clerkKeyPrefix = clerkPublishableKey.substring(0, 7); // "pk_live" or "pk_test"

    // Check Stripe keys
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
    const stripeConfigured = !!(stripeSecretKey && stripePublishableKey);
    const stripeKeyMode = stripeSecretKey.startsWith("sk_live_")
      ? "live"
      : stripeSecretKey.startsWith("sk_test_")
      ? "test"
      : "none";

    // Check billing flag
    const billingEnabled = process.env.BILLING_ENABLED === "true";

    // App URL
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "not_set";

    return NextResponse.json({
      environment: process.env.NODE_ENV,
      database: {
        urlConfigured: !!dbUrl,
        accelerateUrlConfigured: accelerateConfigured,
        accelerateUrlValid: accelerateValid,
        dbFingerprint: getDbFingerprint(dbUrl),
      },
      clerk: {
        configured: clerkConfigured,
        keyPrefix: clerkKeyPrefix,
        // Don't expose full keys, just first few chars
        publishableKeyPresent: !!clerkPublishableKey,
        secretKeyPresent: !!clerkSecretKey,
      },
      stripe: {
        configured: stripeConfigured,
        mode: stripeKeyMode,
        secretKeyPresent: !!stripeSecretKey,
        publishableKeyPresent: !!stripePublishableKey,
        webhookSecretPresent: !!process.env.STRIPE_WEBHOOK_SECRET,
        priceIdPresent: !!process.env.STRIPE_PRICE_FIRM,
      },
      billing: {
        enabled: billingEnabled,
        flagValue: process.env.BILLING_ENABLED || "not_set",
      },
      app: {
        url: appUrl,
      },
      // Security check: ensure no public secret keys
      security: {
        hasPublicClerkSecret: !!process.env.NEXT_PUBLIC_CLERK_SECRET_KEY,
        // This should always be false - if true, it's a security issue
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

