import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/utils/clerk";

/**
 * Get all policies for attorney dashboard
 * Returns key metadata without unnecessary document detail
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    // Get all policies with key metadata
    // Attorneys have global access to all policies
    const policies = await prisma.$queryRawUnsafe<Array<{
      id: string,
      policyNumber: string | null,
      policyType: string | null,
      verificationStatus: string,
      updatedAt: Date,
      createdAt: Date,
      clientId: string,
      clientFirstName: string,
      clientLastName: string,
      clientEmail: string,
      insurerId: string,
      insurerName: string,
      documentCount: number,
    }>>(`
      SELECT 
        p.id,
        p.policy_number,
        p.policy_type,
        p.verificationStatus,
        p.updated_at,
        p.createdAt,
        p.clientId,
        c.firstName as client_firstName,
        c.lastName as client_lastName,
        c.email as client_email,
        i.id as insurer_id,
        i.name as insurer_name,
        COUNT(DISTINCT d.id)::int as document_count
      FROM policies p
      INNER JOIN clients c ON c.id = p.clientId
      INNER JOIN insurers i ON i.id = p.insurer_id
      LEFT JOIN documents d ON d.policyId = p.id
      GROUP BY p.id, c.firstName, c.lastName, c.email, i.id, i.name
      ORDER BY p.updated_at DESC
      LIMIT 100
    `);

    return NextResponse.json({
      policies: policies.map(p => ({
        id: p.id,
        policyNumber: p.policyNumber,
        policyType: p.policyType,
        verificationStatus: p.verificationStatus,
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
        client: {
          id: p.clientId,
          firstName: p.clientFirstName,
          lastName: p.clientLastName,
          email: p.clientEmail,
        },
        insurer: {
          id: p.insurerId,
          name: p.insurerName,
        },
        documentCount: p.documentCount,
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

