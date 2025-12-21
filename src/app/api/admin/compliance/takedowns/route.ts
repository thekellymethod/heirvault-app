import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

/**
 * Get takedown requests
 * Admin-only endpoint
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    // TODO: Implement takedown requests storage (database table)
    // For now, return empty array
    const requests: any[] = [];

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("Error fetching takedown requests:", error);
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch takedown requests" },
      { status: 500 }
    );
  }
}

/**
 * Process takedown request (approve/reject)
 * Admin-only endpoint
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { requestId, action } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Request ID and action are required" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // TODO: Implement takedown request processing
    // This would update the request status and potentially remove/redact the entity

    return NextResponse.json({ success: true, message: `Request ${action}d` });
  } catch (error: any) {
    console.error("Error processing takedown request:", error);
    if (error.message === "Forbidden: Admin access required" || error.message === "Unauthorized") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to process takedown request" },
      { status: 500 }
    );
  }
}

