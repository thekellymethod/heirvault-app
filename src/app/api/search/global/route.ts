import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
import { getCurrentUserWithOrg } from "@/lib/authz";

export const runtime = "nodejs";

/**
 * Global Search API - Searches across ALL organizations in the database
 * Only accessible to attorneys. This allows attorneys to search for clients
 * and policies outside their own organization's registry.
 * 
 * IMPORTANT: This searches the private, voluntary registry database.
 * It does NOT search insurer databases or locate unregistered policies.
 */
export async function GET(req: Request) {
  try {
    // Require attorney authentication
    const user = await requireAuth("attorney");
    
    // Get user with org memberships for audit logging
    const { user: userWithOrg, orgMember } = await getCurrentUserWithOrg();
    
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ clients: [], policies: [] });
    }

    // Global search - search across ALL organizations and ALL clients
    // Use raw SQL first for reliability
    let clients: Array<{
      id: string,
      firstName: string,
      lastName: string,
      email: string,
      phone: string | null;
      createdAt: Date;
      org: { id: string, name: string | null } | null;
    }> = [];
    let policies: Array<{
      id: string,
      policyNumber: string | null;
      policyType: string | null;
      createdAt: Date;
      client: {
        id: string,
        firstName: string,
        lastName: string,
        email: string,
        org: { id: string, name: string | null } | null;
      };
      insurer: { name: string };
    }> = [];
    
    try {
      // Create search pattern once for reuse
      const searchPattern = `%${q.replace(/'/g, "''")}%`;
      
      // Search clients using raw SQL
      const clientsResult = await prisma.$queryRawUnsafe<Array<{
        id: string,
        firstName: string,
        lastName: string,
        email: string,
        phone: string | null;
        createdAt: Date;
        org_id: string | null;
        org_name: string | null;
      }>>(
        `SELECT 
          c.id,
          c.firstName,
          c.lastName,
          c.email,
          c.phone,
          c.createdAt,
          c.org_id,
          o.name as org_name
        FROM clients c
        LEFT JOIN organizations o ON o.id = c.org_id
        WHERE 
          LOWER(c.firstName) LIKE LOWER($1) OR
          LOWER(c.lastName) LIKE LOWER($1) OR
          LOWER(c.email) LIKE LOWER($1) OR
          (c.phone IS NOT NULL AND LOWER(c.phone) LIKE LOWER($1))
        ORDER BY c.createdAt DESC
        LIMIT 50`,
        searchPattern
      );

      clients = clientsResult.map(row => ({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        createdAt: row.createdAt,
        org: row.org_id ? {
          id: row.org_id,
          name: row.org_name,
        } : null,
      }));

      // Search policies using raw SQL (reusing searchPattern)
      const policiesResult = await prisma.$queryRawUnsafe<Array<{
        policy_id: string,
        policy_number: string | null;
        policy_type: string | null;
        policy_createdAt: Date;
        clientId: string,
        client_firstName: string,
        client_lastName: string,
        client_email: string,
        client_org_id: string | null;
        client_org_name: string | null;
        insurer_name: string,
      }>>(
        `SELECT 
          p.id as policy_id,
          p.policy_number,
          p.policy_type,
          p.createdAt as policy_createdAt,
          c.id as client_id,
          c.firstName as client_firstName,
          c.lastName as client_lastName,
          c.email as client_email,
          c.org_id as client_org_id,
          o.name as client_org_name,
          i.name as insurer_name
        FROM policies p
        INNER JOIN clients c ON c.id = p.client_id
        LEFT JOIN organizations o ON o.id = c.org_id
        INNER JOIN insurers i ON i.id = p.insurer_id
        WHERE 
          LOWER(i.name) LIKE LOWER($1) OR
          (p.policy_number IS NOT NULL AND LOWER(p.policy_number) LIKE LOWER($1))
        ORDER BY p.createdAt DESC
        LIMIT 50`,
        searchPattern
      );

      policies = policiesResult.map(row => ({
        id: row.policy_id,
        policyNumber: row.policy_number,
        policyType: row.policy_type,
        createdAt: row.policy_createdAt,
        client: {
          id: row.client_id,
          firstName: row.client_firstName,
          lastName: row.client_lastName,
          email: row.client_email,
          org: row.client_org_id ? {
            id: row.client_org_id,
            name: row.client_org_name,
          } : null,
        },
        insurer: {
          name: row.insurer_name,
        },
      }));
    } catch (sqlError: unknown) {
      const sqlErrorMessage = sqlError instanceof Error ? sqlError.message : "Unknown error";
      console.error("Global search: Raw SQL failed:", sqlErrorMessage);
      // Return empty results if query fails
      clients = [];
      policies = [];
    }

    // Log the global search for audit purposes (internal audit log, not visible to users)
    // This search includes ALL clients across ALL organizations
    try {
      const orgId = orgMember?.organizationId || null;
      await prisma.$executeRawUnsafe(
        `INSERT INTO audit_logs (action, message, user_id, org_id, createdAt) 
         VALUES ($1, $2, $3, $4, NOW())`,
        "GLOBAL_POLICY_SEARCH_PERFORMED",
        `Global database search (all clients): "${q}" | Results: ${clients.length} client(s), ${policies.length} policy(ies)`,
        user.id,
        orgId
      );
    } catch (auditError) {
      console.error("Failed to log global search audit:", auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      clients: clients.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        dateOfBirth: c.dateOfBirth,
        organization: c.org ? {
          id: c.org.id,
          name: c.org.name,
        } : null,
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
          organization: p.client.org ? {
            id: p.client.org.id,
            name: p.client.org.name,
          } : null,
        },
      })),
      // Include disclaimer about global search
      disclaimer: "This search queries the private, voluntary registry database across ALL organizations. All clients entered into the system are included in this search. Results only include information that has been voluntarily registered. This is not a comprehensive database and does not search insurer records.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in global search:", error);
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status: error.message === "Unauthorized" || error.message === "Forbidden" ? 401 : 500 }
    );
  }
}

