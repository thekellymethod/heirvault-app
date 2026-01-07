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
    const { findMany: findManyDb, getDb } = await import("@/lib/db");
    const db = getDb();
    
    // Get access records for this attorney
    const accessRecords = await findManyDb("attorney_client_access", {
      where: {
        attorneyId: user.id,
        isActive: true,
      },
    });
    
    // Get client IDs from access records
    const clientIds = (accessRecords as any[]).map((r: any) => r.clientId);
    
    if (clientIds.length === 0) {
      const response = createPaginationResponse([], 0, page, limit);
      return NextResponse.json(response);
    }
    
    // Fetch clients
    const clients = await findManyDb("clients", {
      where: { id: { in: clientIds } as any },
    });
    const clientsMap = new Map((clients as any[]).map((c: any) => [c.id, c]));
    
    // Build policies query
    let policiesQuery = db.from("policies").select("*");
    policiesQuery = policiesQuery.in("clientId", clientIds);
    
    // Apply search filters
    if (searchTerm) {
      policiesQuery = policiesQuery.or(`policyNumber.ilike.%${searchTerm}%,policyType.ilike.%${searchTerm}%,carrierNameRaw.ilike.%${searchTerm}%`);
    }
    
    // Apply sorting
    const sortColumn = sortBy === 'policyNumber' ? 'policyNumber' :
                     sortBy === 'verificationStatus' ? 'verificationStatus' :
                     'createdAt';
    const sortAscending = sortBy === 'createdAt' ? false : true; // Default desc for createdAt
    policiesQuery = policiesQuery.order(sortColumn, { ascending: sortAscending });
    
    // Apply pagination
    policiesQuery = policiesQuery.range(skip, skip + limit - 1);
    
    const { data: policies, error: policiesError } = await policiesQuery;
    if (policiesError) throw policiesError;
    
    // Get policy IDs and fetch insurers
    const policyIds = (policies as any[]).map((p: any) => p.id);
    const insurerIds = [...new Set((policies as any[]).map((p: any) => p.insurerId).filter(Boolean))];
    
    const insurers = insurerIds.length > 0
      ? await findManyDb("insurers", {
          where: { id: { in: insurerIds } as any },
        })
      : [];
    const insurersMap = new Map((insurers as any[]).map((i: any) => [i.id, i]));

    // Map policies to rows with client and insurer info
    const rows = (policies as any[]).map((policy: any) => {
      const client = clientsMap.get(policy.clientId);
      const insurer = policy.insurerId ? insurersMap.get(policy.insurerId) : null;
      
      return {
        policy: {
          id: policy.id,
          policyNumber: policy.policyNumber,
          policyType: policy.policyType,
          carrierNameRaw: policy.carrierNameRaw,
          verificationStatus: policy.verificationStatus || 'PENDING',
          createdAt: policy.createdAt,
          updatedAt: policy.updatedAt,
        },
        client: client ? {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
        } : null,
        insurer: insurer ? {
          id: insurer.id,
          name: insurer.name,
        } : null,
      };
    });

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
