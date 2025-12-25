import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireVerifiedAttorney } from "@/lib/auth/guards";
import { prisma, logAccess } from "@/lib/db";
import { randomUUID } from "crypto";
import { sendAccessGrantedEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Access Control API
 * Protected endpoint - requires authentication
 * 
 * Request access flow, approvals (admin/system)
 * Audit: ACCESS_REQUESTED / ACCESS_GRANTED
 */

// Registry access requests table (in-memory for Phase 5, can be moved to DB later)
// In production, create a registry_access_requests table
interface AccessRequest {
  id: string,
  registryId: string,
  requestedByUserId: string,
  requestedAt: Date;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedByUserId?: string,
  approvedAt?: Date;
  reason?: string,
}

// In-memory store (Phase 5 - replace with database table in production)
const accessRequests: Map<string, AccessRequest> = new Map();

/**
 * POST /api/access
 * 
 * Request access to a registry
 * 
 * Body: { registryId, reason }
 */
export async function POST(req: NextRequest) {
  try {
    // Require attorney authentication
    const user = await requireVerifiedAttorney();

    const body = await req.json();
    const { registryId, reason } = body;

    // Validate registry ID
    if (!registryId || typeof registryId !== "string") {
      return NextResponse.json(
        { error: "Registry ID is required" },
        { status: 400 }
      );
    }

    // Verify registry exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registry = await (prisma as any).registry_records.findFirst({
      where: { id: registryId },
      select: {
        id: true,
        decedentName: true,
      },
    });

    if (!registry) {
      return NextResponse.json(
        { error: "Registry not found" },
        { status: 404 }
      );
    }

    // Check if user already has access
    // Phase 0: All attorneys have global access, so access requests are not needed
    // Future: Check actual access grants from database
    // For now, inform user that access requests are not needed in Phase 0
    const hasAccess = true; // Phase 0: global access

    if (hasAccess) {
      return NextResponse.json(
        { 
          error: "You already have access to this registry. In Phase 0, all attorneys have global access.",
          hasAccess: true,
          note: "Access requests will be required in future phases when fine-grained permissions are implemented.",
        },
        { status: 400 }
      );
    }

    // Check if request already exists
    const existingRequest = Array.from(accessRequests.values()).find(
      (req) => req.registryId === registryId && 
               req.requestedByUserId === user.id && 
               req.status === "PENDING"
    );

    if (existingRequest) {
      return NextResponse.json(
        { 
          error: "Access request already pending",
          requestId: existingRequest.id,
        },
        { status: 400 }
      );
    }

    // Create access request
    const requestId = randomUUID();
    const accessRequest: AccessRequest = {
      id: requestId,
      registryId,
      requestedByUserId: user.id,
      requestedAt: new Date(),
      status: "PENDING",
      reason: reason || null,
    };

    accessRequests.set(requestId, accessRequest);

    // Audit: ACCESS_REQUESTED
    await logAccess({
      registry_id: registryId,
      user_id: user.id,
      action: "ACCESS_REQUESTED",
      metadata: {
        source: "access_api",
        requestId,
        reason: reason || null,
        decedentName: registry.decedentName,
      },
    });

    return NextResponse.json({
      success: true,
      requestId,
      message: "Access request submitted. Pending admin approval.",
      status: "PENDING",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in access request:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to process access request" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/access
 * 
 * Get access requests (admin only)
 * 
 * Query params: ?status=PENDING|APPROVED|REJECTED
 */
export async function GET(req: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    // Get all requests
    let requests = Array.from(accessRequests.values());

    // Filter by status if provided
    if (statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(statusFilter)) {
      requests = requests.filter((req) => req.status === statusFilter);
    }

    // Sort by requested date (newest first)
    requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    // Enrich requests with registry and user information
    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        // Get registry info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const registry = await (prisma as any).registry_records.findFirst({
          where: { id: req.registryId },
          select: {
            id: true,
            decedentName: true,
          },
        });

        // Get requester info
        const requester = await prisma.user.findFirst({
          where: { id: req.requestedByUserId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        return {
          ...req,
          decedentName: registry?.decedentName || null,
          requesterEmail: requester?.email || null,
          requesterName: requester?.firstName && requester?.lastName
            ? `${requester.firstName} ${requester.lastName}`
            : requester?.email || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      requests: enrichedRequests,
      count: enrichedRequests.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching access requests:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to fetch access requests" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/access
 * 
 * Approve or reject access request (admin only)
 * 
 * Body: { requestId, action: "APPROVE" | "REJECT", reason? }
 */
export async function PATCH(req: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdmin();

    const body = await req.json();
    const { requestId, action, reason } = body;

    // Validate request ID
    if (!requestId || typeof requestId !== "string") {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    // Validate action
    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be APPROVE or REJECT" },
        { status: 400 }
      );
    }

    // Get access request
    const accessRequest = accessRequests.get(requestId);
    if (!accessRequest) {
      return NextResponse.json(
        { error: "Access request not found" },
        { status: 404 }
      );
    }

    // Check if already processed
    if (accessRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `Access request already ${accessRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Update request
    accessRequest.status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    accessRequest.approvedByUserId = admin.id;
    accessRequest.approvedAt = new Date();
    if (reason) {
      accessRequest.reason = reason;
    }

    accessRequests.set(requestId, accessRequest);

    // Get registry info for audit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registry = await (prisma as any).registry_records.findFirst({
      where: { id: accessRequest.registryId },
      select: {
        id: true,
        decedentName: true,
      },
    });

    // Audit: ACCESS_GRANTED for approvals, ACCESS_REQUESTED for rejections (with action=REJECT in metadata)
    await logAccess({
      registry_id: accessRequest.registryId,
      user_id: admin.id,
      action: action === "APPROVE" ? "ACCESS_GRANTED" : "ACCESS_REQUESTED",
      metadata: {
        source: "access_api",
        requestId,
        action: action, // "APPROVE" or "REJECT"
        requestedByUserId: accessRequest.requestedByUserId,
        reason: reason || null,
        decedentName: registry?.decedentName || null,
        status: accessRequest.status,
      },
    });

    // If approved, grant access (Phase 0: all attorneys have global access, so this is a no-op)
    // Future: Create access grant record in database
    if (action === "APPROVE") {
      // TODO: Create access grant in database
      // await createAccessGrant({
      //   registryId: accessRequest.registryId,
      //   userId: accessRequest.requestedByUserId,
      //   grantedByUserId: admin.id,
      // });

      // Send email notification to the attorney who was granted access
      try {
        const attorney = await prisma.user.findFirst({
          where: { id: accessRequest.requestedByUserId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        if (attorney && attorney.email) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
          const dashboardUrl = `${baseUrl}/dashboard/records/${accessRequest.registryId}`;
          const attorneyName = attorney.firstName && attorney.lastName
            ? `${attorney.firstName} ${attorney.lastName}`
            : attorney.email;
          const clientName = registry?.decedentName || "Registry";

          await sendAccessGrantedEmail({
            to: attorney.email,
            attorneyName,
            clientName,
            dashboardUrl,
          }).catch((emailError) => {
            console.error("Error sending access granted email:", emailError);
            // Don't fail the request if email fails
          });
        }
      } catch (emailError) {
        console.error("Error sending access granted email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      requestId,
      status: accessRequest.status,
      message: `Access request ${action === "APPROVE" ? "approved" : "rejected"}`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing access request:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to process access request" },
      { status: 500 }
    );
  }
}
