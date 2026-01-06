import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
;
import { requireAuthPrincipal } from "@/lib/permissions/guard";

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
    const membership = await prisma.org_members.findFirst({
      where: { userId: principal.dbUserId },
      include: { organizations: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    const organizationId = membership.organizations.id;

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100); // Max 100 per page
    const eventType = searchParams.get("eventType");
    const since = searchParams.get("since"); // ISO date string

    // Build where clause
    const where: {
      organizationId: string;
      eventType?: string;
      createdAt?: { gte: Date };
    } = {
      organizationId,
    };

    if (eventType) {
      where.eventType = eventType;
    }

    if (since) {
      try {
        where.createdAt = { gte: new Date(since) };
      } catch {
        // Invalid date, ignore
      }
    }

    // Get total count for pagination
    const total = await prisma.billing_events_ledger.count({ where });

    // Get events (ordered by createdAt desc, most recent first)
    const events = await prisma.billing_events_ledger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      organizationId,
      events: events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        eventPayload: event.eventPayload,
        createdAt: event.createdAt.toISOString(),
        createdBy: event.users
          ? {
              id: event.users.id,
              email: event.users.email,
              name: `${event.users.firstName || ""} ${event.users.lastName || ""}`.trim() || null,
            }
          : null,
      })),
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
