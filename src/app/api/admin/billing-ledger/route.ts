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
    // Database uses snake_case: organization_id, event_type, created_at, created_by_user_id
    let countQuery = db.from("billing_events_ledger").select("*", { count: "exact", head: true }).eq("organization_id", organizationId);
    let eventsQuery = db.from("billing_events_ledger").select("*").eq("organization_id", organizationId);

    if (eventType) {
      countQuery = countQuery.eq("event_type", eventType);
      eventsQuery = eventsQuery.eq("event_type", eventType);
    }

    if (since) {
      try {
        const sinceDate = new Date(since).toISOString();
        countQuery = countQuery.gte("created_at", sinceDate);
        eventsQuery = eventsQuery.gte("created_at", sinceDate);
      } catch {
        // Invalid date, ignore
      }
    }

    // Get total count for pagination
    const { count: totalCount } = await countQuery;
    const total = totalCount || 0;

    // Get events (ordered by created_at desc, most recent first)
    // Database returns snake_case column names
    type BillingEventRecord = {
      id: string;
      organization_id: string;
      event_type: string;
      event_payload: Record<string, unknown>;
      created_at: string;
      created_by_user_id: string | null;
    };
    
    const { data: eventsData } = await eventsQuery
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    
    const events = (eventsData || []) as BillingEventRecord[];

    // Fetch users for each event
    const eventsWithUsers = await Promise.all(
      (events || []).map(async (event) => {
        const user = event.created_by_user_id
          ? await findUniqueUser<{
              id: string;
              email: string;
              first_name: string | null;
              last_name: string | null;
            }>("users", { id: event.created_by_user_id })
          : null;
        
        return {
          id: event.id,
          eventType: event.event_type,
          eventPayload: event.event_payload,
          createdAt: typeof event.created_at === 'string' ? event.created_at : new Date(event.created_at).toISOString(),
          createdBy: user
            ? {
                id: user.id,
                email: user.email,
                name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || null,
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
