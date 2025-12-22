import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserWithOrg } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { user, orgMember } = await getCurrentUserWithOrg();

    if (!user || !orgMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const firstName = searchParams.get("firstName")?.trim();
    const lastName = searchParams.get("lastName")?.trim();
    const dateOfBirth = searchParams.get("dateOfBirth");
    const dateOfDeath = searchParams.get("dateOfDeath");
    const state = searchParams.get("state");
    const relationship = searchParams.get("relationship");
    const ssn = searchParams.get("ssn")?.trim();
    const address = searchParams.get("address")?.trim();
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
        c.first_name,
        c.last_name,
        c.date_of_birth,
        p.id as policy_id,
        p.policy_number,
        p.policy_type,
        i.name as insurer_name
      FROM clients c
      INNER JOIN policies p ON p.client_id = c.id
      INNER JOIN insurers i ON i.id = p.insurer_id
      WHERE c.org_id = $1
        AND LOWER(c.first_name) LIKE LOWER($2)
        AND LOWER(c.last_name) LIKE LOWER($3)
    `;
    
    const params: any[] = [
      orgMember.organizationId,
      `%${firstName}%`,
      `%${lastName}%`,
    ];

    // Add optional filters
    if (dateOfBirth) {
      query += ` AND c.date_of_birth = $${params.length + 1}`;
      params.push(new Date(dateOfBirth));
    }

    if (policyNumber) {
      query += ` AND LOWER(p.policy_number) LIKE LOWER($${params.length + 1})`;
      params.push(`%${policyNumber}%`);
    }

    query += ` ORDER BY c.created_at DESC LIMIT 50`;

    // Execute query
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string;
      first_name: string;
      last_name: string;
      date_of_birth: Date | null;
      policy_id: string;
      policy_number: string | null;
      policy_type: string | null;
      insurer_name: string;
    }>>(query, ...params);

    // Map results
    const results = rows.map((row) => ({
      id: row.id,
      clientName: `${row.first_name} ${row.last_name}`,
      policyNumber: row.policy_number,
      policyType: row.policy_type,
      insurerName: row.insurer_name,
      dateOfBirth: row.date_of_birth,
      dateOfDeath: null, // This would need to be added to the schema if needed
    }));

    // Log the policy search for audit purposes (internal audit log, not visible to users)
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO audit_logs (action, message, user_id, org_id, created_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        "POLICY_SEARCH_PERFORMED",
        `Policy search: ${firstName} ${lastName}${dateOfBirth ? ` (DOB: ${dateOfBirth})` : ""}${policyNumber ? ` | Policy #: ${policyNumber}` : ""} | Results: ${results.length} policy(ies)`,
        user.id,
        orgMember.organizationId
      );
    } catch (auditError) {
      console.error("Failed to log policy search audit:", auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Error in policy locator search:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

