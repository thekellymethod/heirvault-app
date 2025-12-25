import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/utils/clerk";

/**
 * Get all policies for attorney dashboard
 * Returns key metadata without unnecessary document detail
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth();

    // Get all policies with key metadata
    // Attorneys have global access to all policies
    const policies = await prisma.$queryRawUnsafe<Array<{
      id: string;
      policy_number: string | null;
      policy_type: string | null;
      verification_status: string;
      updated_at: Date;
      created_at: Date;
      client_id: string;
      client_first_name: string;
      client_last_name: string;
      client_email: string;
      insurer_id: string;
      insurer_name: string;
      document_count: number;
    }>>(`
      SELECT 
        p.id,
        p.policy_number,
        p.policy_type,
        p.verification_status,
        p.updated_at,
        p.created_at,
        p.client_id,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        i.id as insurer_id,
        i.name as insurer_name,
        COUNT(DISTINCT d.id)::int as document_count
      FROM policies p
      INNER JOIN clients c ON c.id = p.client_id
      INNER JOIN insurers i ON i.id = p.insurer_id
      LEFT JOIN documents d ON d.policy_id = p.id
      GROUP BY p.id, c.first_name, c.last_name, c.email, i.id, i.name
      ORDER BY p.updated_at DESC
      LIMIT 100
    `);

    return NextResponse.json({
      policies: policies.map(p => ({
        id: p.id,
        policyNumber: p.policy_number,
        policyType: p.policy_type,
        verificationStatus: p.verification_status,
        updatedAt: p.updated_at,
        createdAt: p.created_at,
        client: {
          id: p.client_id,
          firstName: p.client_first_name,
          lastName: p.client_last_name,
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

