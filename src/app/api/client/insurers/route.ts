import { NextResponse } from "next/server";

// Clients don't have accounts - they access via invitation links
// This endpoint is disabled - clients should use /invite/[token] routes instead
export async function GET() {
  return NextResponse.json(
    { error: "Client accounts are not available. Please use your invitation link to access your information." },
    { status: 403 }
  );
}
