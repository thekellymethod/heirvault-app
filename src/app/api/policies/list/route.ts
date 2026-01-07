import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/clerk";
;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get("search")?.trim() || "";
    const sortBy = searchParams.get("sort") || "createdAt";
    const { parsePaginationParams, createPaginationResponse } = await import("@/lib/api/pagination");
    const { page, limit, skip } = parsePaginationParams(searchParams);

    // Build search conditions (case-insensitive)
    const searchWhere = searchTerm
      ? {
          OR: [
            { policyNumber: { contains: searchTerm, mode: 'insensitive' as const } },
            { policyType: { contains: searchTerm, mode: 'insensitive' as const } },
            { carrierNameRaw: { contains: searchTerm, mode: 'insensitive' as const } },
            { clients: {
                OR: [
                  { firstName: { contains: searchTerm, mode: 'insensitive' as const } },
                  { lastName: { contains: searchTerm, mode: 'insensitive' as const } },
                  { email: { contains: searchTerm, mode: 'insensitive' as const } },
                ],
              },
            },
            { insurers: { name: { contains: searchTerm, mode: 'insensitive' as const } } },
          ],
        }
      : {};

    // Build sort order
    let orderBy: Array<Record<string, unknown>> | Record<string, unknown>;
    switch (sortBy) {
      case "clientName":
        orderBy = [{ clients: { lastName: 'desc' } }, { clients: { firstName: 'desc' } }];
        break;
      case "insurer":
        orderBy = [{ insurers: { name: 'desc' } }];
        break;
      case "policyNumber":
        orderBy = [{ policyNumber: 'desc' }];
        break;
      case "verificationStatus":
        orderBy = [{ verificationStatus: 'desc' }];
        break;
      case "createdAt":
      default:
        orderBy = [{ createdAt: 'desc' }];
        break;
    }

    // Fetch policies joined with authorized clients
    const accessRecords = await prisma.attorneyClientAccess.findMany({
      where: {
        attorneyId: user.id,
        isActive: true,
      },
      include: {
        clients: {
          include: {
            policies: {
              where: searchWhere,
              include: {
                insurers: true,
              },
              orderBy: (Array.isArray(orderBy) && orderBy.length === 1 ? orderBy[0] : orderBy) as Record<string, unknown> | undefined,
            },
          },
        },
      },
    });

    const rows = accessRecords.flatMap((access: typeof accessRecords[number]) =>
      access.clients.policies.map((policy: typeof access.clients.policies[number]) => ({
        policy: {
          id: policy.id,
          policyNumber: policy.policyNumber,
          policyType: policy.policyType,
          carrierNameRaw: policy.carrierNameRaw,
          verificationStatus: (policy as { verificationStatus?: string }).verificationStatus || 'PENDING',
          createdAt: policy.createdAt,
          updatedAt: policy.updatedAt,
        },
        client: {
          id: access.clients.id,
          firstName: access.clients.firstName,
          lastName: access.clients.lastName,
          email: access.clients.email,
        },
        insurer: policy.insurers ? {
          id: policy.insurers.id,
          name: policy.insurers.name,
        } : null,
      }))
    );

    const policiesList = rows.map((r: typeof rows[number]) => {
      const displayName = r.insurer?.name ?? r.policy.carrierNameRaw ?? "Unknown";
      const isUnresolved = !r.insurer?.name && !!r.policy.carrierNameRaw;
      
      return {
        id: r.policy.id,
        policyNumber: r.policy.policyNumber,
        policyType: r.policy.policyType,
        carrierNameRaw: r.policy.carrierNameRaw,
        verificationStatus: r.policy.verificationStatus,
        createdAt: r.policy.createdAt,
        updatedAt: r.policy.updatedAt,
        client: {
          id: r.client.id,
          firstName: r.client.firstName,
          lastName: r.client.lastName,
          email: r.client.email,
        },
        insurer: r.insurer ? {
          id: r.insurer.id,
          name: r.insurer.name,
        } : null,
        displayName,
        isUnresolved,
      };
    });

    // Get total count (before pagination)
    const totalCount = policiesList.length;
    
    // Apply pagination
    const paginatedPolicies = policiesList.slice(skip, skip + limit);
    
    const response = createPaginationResponse(paginatedPolicies, totalCount, page, limit);
    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load policies";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
