import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { requireAuthPrincipal } from "@/lib/permissions/guard";
import { getOrgContext } from "@/lib/org/getOrgContext";

/**
 * GET /api/admin/billing-ledger
 * 
 * Returns paginated billing events ledger for the authenticated user's organization.
 * Admin-only endpoint.
 */
export async function GET(req: NextRequest) {
  try {
    // Require admin access
    await requireAdmin();
    
    const principal = await requireAuthPrincipal();

    // Get user's organization
    const { org } = await getOrgContext(principal);
    const organizationId = org.id;

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100); // Max 100 per page
    const eventType = searchParams.get("eventType");
    const since = searchParams.get("since"); // ISO date string

    const { findMany: findManyEvents, count: countEvents, findUnique: findUniqueUser, getDb } = await import("@/lib/db");
    const db = getDb();
    
    // Build query with Supabase query builder for date filtering
    let countQuery = db.from("billing_events_ledger").select("*", { count: "exact", head: true }).eq("organizationId", organizationId);
    let eventsQuery = db.from("billing_events_ledger").select("*").eq("organizationId", organizationId);

    if (eventType) {
      countQuery = countQuery.eq("eventType", eventType);
      eventsQuery = eventsQuery.eq("eventType", eventType);
    }

    if (since) {
      try {
        const sinceDate = new Date(since).toISOString();
        countQuery = countQuery.gte("createdAt", sinceDate);
        eventsQuery = eventsQuery.gte("createdAt", sinceDate);
      } catch {
        // Invalid date, ignore
      }
    }

    // Get total count for pagination
    const { count: totalCount } = await countQuery;
    const total = totalCount || 0;

    // Get events (ordered by createdAt desc, most recent first)
    type BillingEventRecord = {
      id: string;
      organizationId: string;
      eventType: string;
      eventPayload: Record<string, unknown>;
      createdAt: string;
      createdByUserId: string | null;
    };
    
    const { data: eventsData } = await eventsQuery
      .order("createdAt", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    const events = (eventsData || []) as BillingEventRecord[];

    // Fetch users for each event
    const eventsWithUsers = await Promise.all(
      (events || []).map(async (event) => {
        const user = event.createdByUserId
          ? await findUniqueUser<{
              id: string;
              email: string;
              firstName: string | null;
              lastName: string | null;
            }>("users", { id: event.createdByUserId })
          : null;
        
        return {
          id: event.id,
          eventType: event.eventType,
          eventPayload: event.eventPayload,
          createdAt: typeof event.createdAt === 'string' ? event.createdAt : new Date(event.createdAt).toISOString(),
          createdBy: user
            ? {
                id: user.id,
                email: user.email,
                name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      organizationId,
      events: eventsWithUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Admin access required")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    console.error("Error fetching billing ledger:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch ledger" },
      { status: 500 }
    );
  }
}
