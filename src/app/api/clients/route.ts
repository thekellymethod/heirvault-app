import { NextRequest, NextResponse } from "next/server";
;
import { requireAuthApi } from "@/lib/utils/clerk";
import { logAuditEvent } from "@/lib/audit";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { getOrgContext } from "@/lib/org/getOrgContext";
import { requireRegistryActive } from "@/lib/billing/requireRegistryActive";
import { UserRole } from "@/lib/db/enums";
import { randomUUID } from "crypto";
import { organizationIdFromMemberRow } from "@/lib/org/membershipRow";

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

  const { count, findMany } = await import("@/lib/db");
  
  // Get total count
  const totalCount = await count("attorney_client_access", {
    attorneyId: user.id,
    isActive: true,
  });

  // Attorney's accessible clients (via AttorneyClientAccess) with pagination
  const accessRecords = await findMany("attorney_client_access", {
    where: {
      attorneyId: user.id,
      isActive: true,
    },
    orderBy: {
      column: "grantedAt",
      ascending: false,
    },
    limit,
    offset: skip,
  });

  // Fetch clients for each access record
  type AttorneyClientAccess = {
    id: string;
    attorneyId: string;
    clientId: string;
    isActive: boolean;
    grantedAt: string;
  };
  
  type ClientRecord = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: string | null;
    createdAt: string;
    updatedAt: string;
  };

  const clientIds = (accessRecords as AttorneyClientAccess[]).map((r) => r.clientId);
  
  // Fetch clients using 'in' operator (supported by supabase helper)
  const clients = await findMany<ClientRecord>("clients", {
    where: { id: { in: clientIds } },
  });

  // Map clients by ID for quick lookup
  const clientsMap = new Map(clients.map((c) => [c.id, c]));

  const clientList = (accessRecords as AttorneyClientAccess[]).map((r) => {
    const client = clientsMap.get(r.clientId);
    if (!client) return null;
    return {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      dateOfBirth: client.dateOfBirth,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }).filter(Boolean);

  const response = createPaginationResponse(clientList, totalCount, page, limit);
  return NextResponse.json(response);
}

export async function POST(req: NextRequest) {
  // Unified registry gate
  try {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.attorney]);
    
    const { org, orgId } = await getOrgContext(principal);
    await requireRegistryActive({
      billingStatus: org.billingStatus,
      currentPeriodEnd: org.currentPeriodEnd ? (typeof org.currentPeriodEnd === 'string' ? new Date(org.currentPeriodEnd) : org.currentPeriodEnd) : null,
    });

    // Get user's organization for client creation
    const { findMany: findManyDb } = await import("@/lib/db");
    const memberships = await findManyDb("org_members", {
      where: { userId: principal.dbUserId },
      limit: 1,
    });

    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    type OrgMember = {
      id: string;
      userId: string;
      organizationId: string;
      role: string;
      createdAt: string;
    };
    
    const membership = memberships[0] as OrgMember;
    const orgId = organizationIdFromMemberRow(membership as Record<string, unknown>);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }
    const orgs = await findManyDb("organizations", {
      where: { id: orgId },
      limit: 1,
    });

    if (!orgs || orgs.length === 0) {
      return NextResponse.json(
        { error: "Organization not found" },
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

    // Create client + grant attorney access
    const { create: createDb, transaction } = await import("@/lib/db");
    
    const result = await transaction(async (_db) => {
      // Create client
      const client = await createDb("clients", {
        id: randomUUID(),
        email,
        firstName: firstName,
        lastName: lastName,
        phone: phone || null,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : null,
        orgId: orgId, // Set organization ID
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Grant attorney access
      await createDb("attorney_client_access", {
        id: randomUUID(),
        attorneyId: principal.dbUserId,
        clientId: client.id,
        isActive: true,
        grantedAt: new Date().toISOString(),
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
      userId: principal.dbUserId,
      clientId: result.id,
      metadata: { firstName, lastName, email, orgId },
    });

    // Track active estate count change (client created with access grant = may become active)
    const { trackActiveEstateCount } = await import("@/lib/billing/active-estates-tracker");
    await trackActiveEstateCount(orgId, principal.dbUserId);

    return NextResponse.json({ client: result }, { status: 201 });
  } catch (e) {
    const error = e as { status?: number; message?: string };
    const status = error?.status || 402;
    const message = error?.message || "Billing required";
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
