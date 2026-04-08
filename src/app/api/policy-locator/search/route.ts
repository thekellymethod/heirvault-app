import { NextRequest, NextResponse } from "next/server";
;
import { requireAuthPrincipal } from "@/lib/permissions/guard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const principal = await requireAuthPrincipal();
    
    // Get user's org membership
    const { findMany: findManyMembers } = await import("@/lib/db");
    
    type OrgMemberRecord = {
      id: string;
      userId: string;
      organization_id: string;
    };
    
    const memberships = await findManyMembers<OrgMemberRecord>("org_members", {
      where: { userId: principal.dbUserId },
      limit: 1,
    });

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const orgMember = memberships[0];

    const { searchParams } = new URL(req.url);
    const firstName = searchParams.get("firstName")?.trim();
    const lastName = searchParams.get("lastName")?.trim();
    const dateOfBirth = searchParams.get("dateOfBirth");
    const _dateOfDeath = searchParams.get("dateOfDeath");
    const _state = searchParams.get("state");
    const _relationship = searchParams.get("relationship");
    const _ssn = searchParams.get("ssn")?.trim();
    const _address = searchParams.get("address")?.trim();
    const policyNumber = searchParams.get("policyNumber")?.trim();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Build search query using raw SQL
    let query = `
      SELECT DISTINCT
        c.id,
        c.firstName,
        c.lastName,
        c.dateOfBirth,
        p.id as policy_id,
        p.policy_number,
        p.policy_type,
        i.name as insurer_name
      FROM clients c
      INNER JOIN policies p ON p.clientId = c.id
      INNER JOIN insurers i ON i.id = p.insurer_id
      WHERE c.org_id = $1
        AND LOWER(c.firstName) LIKE LOWER($2)
        AND LOWER(c.lastName) LIKE LOWER($3)
    `;
    
    const params: Array<string | Date> = [
      orgMember.organization_id,
      `%${firstName}%`,
      `%${lastName}%`,
    ];

    // Add optional filters
    if (dateOfBirth) {
      query += ` AND c.dateOfBirth = $${params.length + 1}`;
      params.push(new Date(dateOfBirth));
    }

    if (policyNumber) {
      query += ` AND LOWER(p.policy_number) LIKE LOWER($${params.length + 1})`;
      params.push(`%${policyNumber}%`);
    }

    query += ` ORDER BY c.created_at DESC LIMIT 50`;

    // Execute query using Supabase
    const { queryRaw } = await import("@/lib/db");
    const rows = await queryRaw<Array<{
      id: string,
      firstName: string,
      lastName: string,
      dateOfBirth: Date | null;
      policy_id: string,
      policy_number: string | null;
      policy_type: string | null;
      insurer_name: string,
    }>>(query, params);

    // Map results - queryRaw returns an array
    const rowsArray = Array.isArray(rows) ? rows : [];
    const results = rowsArray.map((row: any) => ({
      id: row.id,
      clientName: `${row.firstName} ${row.lastName}`,
      policyNumber: row.policy_number,
      policyType: row.policy_type,
      insurerName: row.insurer_name,
      dateOfBirth: row.dateOfBirth,
      dateOfDeath: null, // This would need to be added to the schema if needed
    }));

    // Log the policy search for audit purposes (internal audit log, not visible to users)
    try {
      const { create: createAudit } = await import("@/lib/db");
      const { randomUUID } = await import("crypto");
      await createAudit("audit_logs", {
        id: randomUUID(),
        action: "POLICY_SEARCH_PERFORMED",
        message: `Policy search: ${firstName} ${lastName}${dateOfBirth ? ` (DOB: ${dateOfBirth})` : ""}${policyNumber ? ` | Policy #: ${policyNumber}` : ""} | Results: ${results.length} policy(ies)`,
        userId: principal.dbUserId,
        orgId: orgMember.organization_id,
        createdAt: new Date().toISOString(),
      } as any);
    } catch (auditError) {
      console.error("Failed to log policy search audit:", auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in policy locator search:", error);
    return NextResponse.json(
      { error: errorMessage || "Internal server error" },
      { status: 500 }
    );
  }
}

