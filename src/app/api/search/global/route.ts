// src/app/api/search/global/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/clerk";
import { getCurrentUserWithOrg } from "@/lib/authz";

export const runtime = "nodejs";

type ClientSearchSqlRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  org_id: string | null;
  org_name: string | null;
};

type PolicySearchSqlRow = {
  policy_id: string;
  policy_number: string | null;
  policy_type: string | null;
  policy_createdAt: Date;
  clientId: string;
  client_firstName: string;
  client_lastName: string;
  client_email: string;
  client_org_id: string | null;
  client_org_name: string | null;
  insurer_name: string;
};

type ClientHit = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  org: { id: string; name: string | null } | null;
};

type PolicyHit = {
  id: string;
  policyNumber: string | null;
  policyType: string | null;
  createdAt: Date;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    org: { id: string; name: string | null } | null;
  };
  insurer: { name: string };
};

// Escape LIKE wildcards so user input behaves predictably
const escapeLike = (s: string) => s.replace(/[%_\\]/g, "\\$&");

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { orgMember } = await getCurrentUserWithOrg();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (!q) {
      return NextResponse.json({ clients: [], policies: [] });
    }

    let clients: ClientHit[] = [];
    let policies: PolicyHit[] = [];

    try {
      const { queryRaw } = await import("@/lib/db");

      // IMPORTANT:
      // Your `queryRaw<T>` likely returns `T[]`.
      // So you must pass the *row type* (T), not `T[]`,
      // otherwise you end up with `T[][]` and TS screams.
      const pattern = `%${escapeLike(q)}%`;

      const clientRows = await queryRaw<ClientSearchSqlRow>(
        `
        SELECT
          c.id,
          c."firstName" as "firstName",
          c."lastName"  as "lastName",
          c.email       as "email",
          c.phone       as "phone",
          c."createdAt" as "createdAt",
          c.org_id      as "org_id",
          o.name        as "org_name"
        FROM clients c
        LEFT JOIN organizations o ON o.id = c.org_id
        WHERE
          LOWER(c."firstName") LIKE LOWER($1) ESCAPE '\\' OR
          LOWER(c."lastName")  LIKE LOWER($1) ESCAPE '\\' OR
          LOWER(c.email)       LIKE LOWER($1) ESCAPE '\\' OR
          (c.phone IS NOT NULL AND LOWER(c.phone) LIKE LOWER($1) ESCAPE '\\')
        ORDER BY c."createdAt" DESC
        LIMIT 50
        `,
        [pattern]
      );

      clients = clientRows.map((row) => ({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        createdAt: row.createdAt,
        org: row.org_id ? { id: row.org_id, name: row.org_name } : null,
      }));

      const policyRows = await queryRaw<PolicySearchSqlRow>(
        `
        SELECT
          p.id          as policy_id,
          p.policy_number,
          p.policy_type,
          p."createdAt" as policy_createdAt,
          c.id          as "clientId",
          c."firstName" as client_firstName,
          c."lastName"  as client_lastName,
          c.email       as client_email,
          c.org_id      as client_org_id,
          o.name        as client_org_name,
          i.name        as insurer_name
        FROM policies p
        INNER JOIN clients c ON c.id = p."clientId"
        LEFT JOIN organizations o ON o.id = c.org_id
        INNER JOIN insurers i ON i.id = p.insurer_id
        WHERE
          LOWER(i.name) LIKE LOWER($1) ESCAPE '\\' OR
          (p.policy_number IS NOT NULL AND LOWER(p.policy_number) LIKE LOWER($1) ESCAPE '\\')
        ORDER BY p."createdAt" DESC
        LIMIT 50
        `,
        [pattern]
      );

      policies = policyRows.map((row) => ({
        id: row.policy_id,
        policyNumber: row.policy_number,
        policyType: row.policy_type,
        createdAt: row.policy_createdAt,
        client: {
          id: row.clientId,
          firstName: row.client_firstName,
          lastName: row.client_lastName,
          email: row.client_email,
          org: row.client_org_id ? { id: row.client_org_id, name: row.client_org_name } : null,
        },
        insurer: { name: row.insurer_name },
      }));
    } catch (sqlError: unknown) {
      const msg = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Global search: SQL failed:", msg);
      clients = [];
      policies = [];
    }

    // Best-effort audit log
    try {
      const { create } = await import("@/lib/db");
      const { randomUUID } = await import("crypto");

      await create("audit_logs", {
        id: randomUUID(),
        action: "GLOBAL_POLICY_SEARCH_PERFORMED",
        message: `Global database search (all clients): "${q}" | Results: ${clients.length} client(s), ${policies.length} policy(ies)`,
        userId: user.id,
        orgId: orgMember?.organization_id ?? null,
        createdAt: new Date().toISOString(),
      } as Record<string, unknown>);
    } catch (auditError: unknown) {
      console.error("Failed to log global search audit:", auditError);
    }

    return NextResponse.json({
      clients: clients.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        organization: c.org ? { id: c.org.id, name: c.org.name } : null,
      })),
      policies: policies.map((p) => ({
        id: p.id,
        insurerName: p.insurer.name,
        policyNumber: p.policyNumber,
        policyType: p.policyType,
        client: {
          id: p.client.id,
          firstName: p.client.firstName,
          lastName: p.client.lastName,
          email: p.client.email,
          organization: p.client.org ? { id: p.client.org.id, name: p.client.org.name } : null,
        },
      })),
      disclaimer:
        "This search queries the private, voluntary registry database across ALL organizations. Results only include information that has been voluntarily registered. This does not search insurer records.",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in global search:", error);
    const isAuthError = errorMessage === "Unauthorized" || errorMessage === "Forbidden";
    return NextResponse.json(
      { error: errorMessage || "Unauthorized" },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
