import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/clerk";

/**
 * Get all policies for attorney dashboard
 * Returns key metadata without unnecessary document detail
 */
export async function GET(_req: NextRequest) {
  try {
    await requireAuth();

    // Get all policies with key metadata
    // Attorneys have global access to all policies
    const { queryRaw } = await import("@/lib/db");
    type PolicyRow = {
      id: string;
      policy_number: string | null;
      policy_type: string | null;
      verificationStatus: string;
      updated_at: Date | string;
      createdAt: Date | string;
      clientId: string;
      client_firstName: string | null;
      client_lastName: string | null;
      client_email: string | null;
      insurer_id: string;
      insurer_name: string | null;
      document_count: number;
    };
    
    const policiesResult = await queryRaw<PolicyRow>(`
      SELECT 
        p.id,
        p.policy_number,
        p.policy_type,
        p.verificationStatus,
        p.updated_at,
        p."createdAt",
        p."clientId",
        c."firstName" as client_firstName,
        c."lastName" as client_lastName,
        c.email as client_email,
        i.id as insurer_id,
        i.name as insurer_name,
        COUNT(DISTINCT d.id)::int as document_count
      FROM policies p
      INNER JOIN clients c ON c.id = p."clientId"
      INNER JOIN insurers i ON i.id = p.insurer_id
      LEFT JOIN documents d ON d."policyId" = p.id
      GROUP BY p.id, c."firstName", c."lastName", c.email, i.id, i.name
      ORDER BY p.updated_at DESC
      LIMIT 100
    `, []);

    const policies: PolicyRow[] = Array.isArray(policiesResult) ? (policiesResult as PolicyRow[]) : [];
    return NextResponse.json({
      policies: policies.map((p) => ({
        id: p.id,
        policyNumber: p.policy_number,
        policyType: p.policy_type,
        verificationStatus: p.verificationStatus,
        updatedAt: typeof p.updated_at === 'string' ? new Date(p.updated_at) : p.updated_at,
        createdAt: typeof p.createdAt === 'string' ? new Date(p.createdAt) : p.createdAt,
        client: {
          id: p.clientId,
          firstName: p.client_firstName,
          lastName: p.client_lastName,
          email: p.client_email,
        },
        insurer: {
          id: p.insurer_id,
          name: p.insurer_name,
        },
        documentCount: p.document_count,
      })),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching dashboard policies:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to fetch policies" },
      { status: 500 }
    );
  }
}

