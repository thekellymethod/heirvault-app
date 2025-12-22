import { NextResponse } from "next/server";

export async function GET() {
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
