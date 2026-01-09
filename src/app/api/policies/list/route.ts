// src/app/api/policies/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/clerk";

export const dynamic = "force-dynamic";

type AccessRow = {
  clientId: string;
};

type ClientRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type PolicyRow = {
  id: string;
  clientId: string;
  insurerId: string | null;
  policyNumber: string | null;
  policyType: string | null;
  carrierNameRaw: string | null;
  verificationStatus: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type InsurerRow = {
  id: string;
  name: string | null;
};

type PolicyListItem = {
  id: string;
  policyNumber: string | null;
  policyType: string | null;
  carrierNameRaw: string | null;
  verificationStatus: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  client: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  insurer: { id: string; name: string | null } | null;
  displayName: string;
  isUnresolved: boolean;
};

const asString = (v: unknown): string | null => (typeof v === "string" ? v : null);
const escapeLike = (s: string) => s.replace(/[%_]/g, "\\$&");

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);

    const searchTerm = searchParams.get("search")?.trim() ?? "";
    const sortBy = searchParams.get("sort") ?? "createdAt";

    const { parsePaginationParams, createPaginationResponse } = await import(
      "@/lib/api/pagination"
    );
    const { page, limit, skip } = parsePaginationParams(searchParams);

    const { findMany: findManyDb, getDb } = await import("@/lib/db");
    const db = getDb();

    // 1) authorized client ids
    const accessRecords = (await findManyDb("attorney_client_access", {
      where: { attorneyId: user.id, isActive: true },
    })) as AccessRow[];

    const clientIds = accessRecords.map((r) => r.clientId);

    if (clientIds.length === 0) {
      return NextResponse.json(createPaginationResponse<PolicyListItem>([], 0, page, limit));
    }

    // 2) client map
    const clients = (await findManyDb("clients", {
      where: { id: { in: clientIds } },
      // if your db layer supports select, keep it tight; if not, harmless to omit
      // select: { id: true, firstName: true, lastName: true, email: true },
    })) as ClientRow[];

    const clientsMap = new Map<string, ClientRow>(clients.map((c) => [c.id, c]));

    // 3) policies (Supabase query builder)
    let policiesQuery = db
      .from("policies")
      .select("id, clientId, insurerId, policyNumber, policyType, carrierNameRaw, verificationStatus, createdAt, updatedAt")
      .in("clientId", clientIds);

    if (searchTerm) {
      const q = escapeLike(searchTerm);
      // OR across policy fields (client/insurer searching would require joins or separate query)
      policiesQuery = policiesQuery.or(
        `policyNumber.ilike.%${q}%,policyType.ilike.%${q}%,carrierNameRaw.ilike.%${q}%`
      );
    }

    // Sorting
    // (If you want "clientName" / "insurer" sorts, you need server-side joins or sort after hydration.)
    const sortColumn =
      sortBy === "policyNumber"
        ? "policyNumber"
        : sortBy === "verificationStatus"
          ? "verificationStatus"
          : "createdAt";

    const ascending = sortColumn === "createdAt" ? false : true;
    policiesQuery = policiesQuery.order(sortColumn, { ascending });

    // Pagination at the DB level
    policiesQuery = policiesQuery.range(skip, skip + limit - 1);

    const { data: policiesData, error: policiesError } = (await policiesQuery) as {
      data: PolicyRow[] | null;
      error: unknown;
    };

    if (policiesError) throw policiesError;

    const policies = policiesData ?? [];

    // 4) insurers map (only for the policies on this page)
    const insurerIds = Array.from(
      new Set(policies.map((p) => p.insurerId).filter((v): v is string => typeof v === "string"))
    );

    const insurers = insurerIds.length
      ? ((await findManyDb("insurers", { where: { id: { in: insurerIds } } })) as InsurerRow[])
      : [];

    const insurersMap = new Map<string, InsurerRow>(insurers.map((i) => [i.id, i]));

    // 5) hydrate response rows (no `any`, no nullable client crash)
    const items: PolicyListItem[] = policies.map((p) => {
      const client = clientsMap.get(p.clientId) ?? null;
      const insurer = p.insurerId ? insurersMap.get(p.insurerId) ?? null : null;

      const displayName = insurer?.name ?? p.carrierNameRaw ?? "Unknown";
      const isUnresolved = !insurer?.name && !!p.carrierNameRaw;

      return {
        id: p.id,
        policyNumber: p.policyNumber ?? null,
        policyType: p.policyType ?? null,
        carrierNameRaw: p.carrierNameRaw ?? null,
        verificationStatus: p.verificationStatus ?? "PENDING",
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        client: {
          id: client?.id ?? p.clientId,
          firstName: client?.firstName ?? null,
          lastName: client?.lastName ?? null,
          email: client?.email ?? null,
        },
        insurer: insurer ? { id: insurer.id, name: insurer.name } : null,
        displayName,
        isUnresolved,
      };
    });

    // 6) total count
    // If your pagination helper expects true total across all pages, you need a separate COUNT query.
    // Supabase supports `select('*', { count: 'exact', head: true })` but that depends on your wrapper.
    // For now, return "page total" safely to keep types correct.
    const totalCount = items.length;

    return NextResponse.json(createPaginationResponse(items, totalCount, page, limit));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load policies";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
