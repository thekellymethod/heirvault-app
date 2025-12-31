import { NextResponse } from "next/server";

/**
 * Debug endpoint to check Clerk configuration
 * Only available in development mode
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const sk = process.env.CLERK_SECRET_KEY ?? "";

  return NextResponse.json({
    hasPublishableKey: !!pk,
    publishableKeyPrefix: pk.slice(0, 8),
    publishableKeyLength: pk.length,
    hasSecretKey: !!sk,
    secretKeyPrefix: sk.slice(0, 8),
    secretKeyLength: sk.length,
  });
}
