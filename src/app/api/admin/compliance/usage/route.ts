import { NextResponse } from "next/server";
;
import { requireAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/errors";

/**
 * Get system usage statistics
 * Admin-only endpoint
 */
export async function GET() {
  try {
    await requireAdmin();

    // Get counts from database using raw SQL
    const { queryRaw } = await import("@/lib/db");
    
    const [
      totalUsersResult,
      totalClientsResult,
      totalPoliciesResult,
      totalOrganizationsResult,
      activeAttorneysResult,
      recentActivityResult,
    ] = await Promise.all([
      queryRaw<Array<{ count: number }>>(`SELECT COUNT(*)::int as count FROM users`, []),
      queryRaw<Array<{ count: number }>>(`SELECT COUNT(*)::int as count FROM clients`, []),
      queryRaw<Array<{ count: number }>>(`SELECT COUNT(*)::int as count FROM policies`, []),
      queryRaw<Array<{ count: number }>>(`SELECT COUNT(*)::int as count FROM organizations`, []),
      queryRaw<Array<{ count: number }>>(`SELECT COUNT(*)::int as count FROM users WHERE role = 'ATTORNEY'`, []),
      queryRaw<Array<{ count: number }>>(
        `SELECT COUNT(*)::int as count FROM audit_logs WHERE "createdAt" >= NOW() - INTERVAL '24 hours'`,
        []
      ),
    ]);

    const totalUsers = Number(totalUsersResult[0]?.count || 0);
    const totalClients = Number(totalClientsResult[0]?.count || 0);
    const totalPolicies = Number(totalPoliciesResult[0]?.count || 0);
    const totalOrganizations = Number(totalOrganizationsResult[0]?.count || 0);
    const activeAttorneys = Number(activeAttorneysResult[0]?.count || 0);
    const recentActivity = Number(recentActivityResult[0]?.count || 0);

    return NextResponse.json({
      totalUsers,
      totalClients,
      totalPolicies,
      totalOrganizations,
      activeAttorneys,
      recentActivity,
    });
  } catch (error: unknown) {
    console.error("Error fetching usage stats:", error);
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage || "Failed to fetch usage statistics" },
      { status: 500 }
    );
  }
}

