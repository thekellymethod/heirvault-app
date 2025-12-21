import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/errors";

/**
 * Get system usage statistics
 * Admin-only endpoint
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    // Get counts from database using raw SQL
    const [
      totalUsersResult,
      totalClientsResult,
      totalPoliciesResult,
      totalOrganizationsResult,
      activeAttorneysResult,
      recentActivityResult,
    ] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*)::int as count FROM users`),
      prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*)::int as count FROM clients`),
      prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*)::int as count FROM policies`),
      prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*)::int as count FROM organizations`),
      prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*)::int as count FROM users WHERE role = 'attorney'`),
      prisma.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*)::int as count FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours'`
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

