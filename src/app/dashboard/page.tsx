import { prisma } from "@/lib/db";
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { AttorneyDashboardView } from "./_components/AttorneyDashboardView";

/**
 * Attorney Dashboard
 * 
 * This is the operational control center. Its function is to give attorneys
 * a real-time overview of all registries, estates, or policy records they
 * are authorized to access. It surfaces key metadata (decedent name, status,
 * carrier verification state, last update timestamp) without exposing
 * unnecessary document detail.
 */
export default async function DashboardPage() {
  // requireVerifiedAttorney will throw if user is not authenticated or not verified
  try {
    const user = await requireVerifiedAttorney();
  } catch (error: unknown) {
    // If error has redirectTo property, redirect there
    if (error && typeof error === "object" && "redirectTo" in error && typeof error.redirectTo === "string") {
      redirect(error.redirectTo);
    }
    // Otherwise redirect to apply page
    redirect("/attorney/apply");
  }

  // Get all policies with key metadata
  // Note: verification_status column may not exist yet, so we query without it and set a default
  let policies: Array<{
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
  }>;

  try {
    // Try querying with verification_status (if column exists)
    policies = await prisma.$queryRawUnsafe(`
      SELECT 
        p.id,
        p.policy_number,
        p.policy_type,
        COALESCE(p.verification_status::text, 'PENDING') as verification_status,
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
      GROUP BY p.id, p.policy_number, p.policy_type, p.verification_status, p.updated_at, p.created_at, p.client_id, c.first_name, c.last_name, c.email, i.id, i.name
      ORDER BY p.updated_at DESC
      LIMIT 100
    `);
  } catch (error: unknown) {
    // If verification_status doesn't exist, query without it and set default
    const err = error as { code?: string; message?: string };
    if (err?.code === '42703' || err?.message?.includes('verification_status')) {
      policies = await prisma.$queryRawUnsafe(`
        SELECT 
          p.id,
          p.policy_number,
          p.policy_type,
          'PENDING' as verification_status,
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
        GROUP BY p.id, p.policy_number, p.policy_type, p.updated_at, p.created_at, p.client_id, c.first_name, c.last_name, c.email, i.id, i.name
        ORDER BY p.updated_at DESC
        LIMIT 100
      `);
    } else {
      throw error;
    }
  }

  // Get summary statistics
  // Note: verification_status may not exist, so we handle it gracefully
  let stats: Array<{
    total_policies: number;
    pending_verification: number;
    verified: number;
    discrepancy: number;
    total_clients: number;
  }>;

  try {
    stats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(DISTINCT p.id)::int as total_policies,
        COUNT(DISTINCT CASE WHEN COALESCE(p.verification_status::text, 'PENDING') = 'PENDING' THEN p.id END)::int as pending_verification,
        COUNT(DISTINCT CASE WHEN COALESCE(p.verification_status::text, 'PENDING') = 'VERIFIED' THEN p.id END)::int as verified,
        COUNT(DISTINCT CASE WHEN COALESCE(p.verification_status::text, 'PENDING') = 'DISCREPANCY' THEN p.id END)::int as discrepancy,
        COUNT(DISTINCT c.id)::int as total_clients
      FROM policies p
      INNER JOIN clients c ON c.id = p.client_id
    `);
  } catch (error: unknown) {
    // If verification_status doesn't exist, count all as pending
    const err = error as { code?: string; message?: string };
    if (err?.code === '42703' || err?.message?.includes('verification_status')) {
      stats = await prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(DISTINCT p.id)::int as total_policies,
          COUNT(DISTINCT p.id)::int as pending_verification,
          0::int as verified,
          0::int as discrepancy,
          COUNT(DISTINCT c.id)::int as total_clients
        FROM policies p
        INNER JOIN clients c ON c.id = p.client_id
      `);
    } else {
      throw error;
    }
  }

  const summaryStats = stats[0] || {
    total_policies: 0,
    pending_verification: 0,
    verified: 0,
    discrepancy: 0,
    total_clients: 0,
  };

  return (
    <AttorneyDashboardView
      policies={policies.map(p => ({
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
      }))}
      stats={{
        totalPolicies: summaryStats.total_policies,
        pendingVerification: summaryStats.pending_verification,
        verified: summaryStats.verified,
        discrepancy: summaryStats.discrepancy,
        totalClients: summaryStats.total_clients,
      }}
    />
  );
}
