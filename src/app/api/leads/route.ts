import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lead capture endpoint (optional)
 * Captures email addresses from marketing pages for follow-up
 * Silently fails if there are issues - doesn't block user flow
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, source } = body;

    // Basic validation
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    // Optional: Store in database or send to email service
    // For now, just log it (you can add database storage later)
    console.log("Lead captured:", { email, source, timestamp: new Date().toISOString() });

    // Optional: Send to email service (Resend, etc.)
    // if (process.env.RESEND_API_KEY) {
    //   await sendLeadNotification({ email, source });
    // }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // Silently fail - don't block user flow
    console.error("Lead capture error (non-blocking):", error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
