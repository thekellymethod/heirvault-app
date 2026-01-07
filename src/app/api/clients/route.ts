import { NextRequest, NextResponse } from "next/server";
;
import { requireAuthApi } from "@/lib/utils/clerk";
import { logAuditEvent } from "@/lib/audit";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { getOrgContext } from "@/lib/org/getOrgContext";
import { requireRegistryActive } from "@/lib/billing/requireRegistryActive";
import { UserRole } from "@prisma/client";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function toDateOnlyOrNull(input: unknown) {
  if (!input) return null;
  const d = new Date(String(input));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthApi();
  if (auth.response) return auth.response;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const { parsePaginationParams, createPaginationResponse } = await import("@/lib/api/pagination");
  const { page, limit, skip } = parsePaginationParams(searchParams);

  // Get total count
  const totalCount = await prisma.attorneyClientAccess.count({
    where: {
      attorneyId: user.id,
      isActive: true,
    },
  });

  // Attorney's accessible clients (via AttorneyClientAccess) with pagination
  const accessRecords = await prisma.attorneyClientAccess.findMany({
    where: {
      attorneyId: user.id,
      isActive: true,
    },
    include: {
      clients: true,
    },
    orderBy: {
      grantedAt: 'desc',
    },
    skip,
    take: limit,
  });

  const clientList = accessRecords.map((r: typeof accessRecords[0]) => ({
    id: r.clients.id,
    firstName: r.clients.firstName,
    lastName: r.clients.lastName,
    email: r.clients.email,
    phone: r.clients.phone,
    dateOfBirth: r.clients.dateOfBirth,
    createdAt: r.clients.createdAt,
    updatedAt: r.clients.updatedAt,
  }));

  const response = createPaginationResponse(clientList, totalCount, page, limit);
  return NextResponse.json(response);
}

export async function POST(req: NextRequest) {
  // Unified registry gate
  try {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN, UserRole.ATTORNEY]);
    
    const { org, orgId } = await getOrgContext(principal);
    await requireRegistryActive(org);

    // Get user's organization for client creation
    const membership = await prisma.org_members.findFirst({
      where: { userId: principal.dbUserId },
      include: { organizations: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const phone = body?.phone ? String(body.phone).trim() : null;
  const dateOfBirth = toDateOnlyOrNull(body?.dateOfBirth);

  if (!firstName || !lastName || !email) {
    return NextResponse.json(
      { error: "firstName, lastName, and email are required" },
      { status: 400 }
    );
  }

    // Create client + grant attorney access in one transaction
    const result = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      // Create client
      const client = await tx.clients.create({
        data: {
          id: randomUUID(),
          email,
          firstName: firstName,
          lastName: lastName,
          phone: phone || null,
          dateOfBirth: dateOfBirth || null,
          orgId: orgId, // Set organization ID
        },
      });

      // Grant attorney access
      await tx.attorneyClientAccess.create({
        data: {
          id: randomUUID(),
          attorneyId: principal.dbUserId,
          clientId: client.id,
          isActive: true,
        },
      });

      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
      };
    });

    await logAuditEvent({
      action: "CLIENT_CREATED",
      resourceType: "client",
      resourceId: result.id,
      details: { firstName, lastName, email },
      userId: principal.dbUserId,
      orgId: orgId,
    });

    // Track active estate count change (client created with access grant = may become active)
    const { trackActiveEstateCount } = await import("@/lib/billing/active-estates-tracker");
    await trackActiveEstateCount(orgId, principal.dbUserId);

    return NextResponse.json({ client: result }, { status: 201 });
  } catch (e) {
    const error = e as { status?: number };
    const status = error?.status || 402;
    return NextResponse.json(
      { error: e?.message || "Billing required" },
      { status }
    );
  }
}
