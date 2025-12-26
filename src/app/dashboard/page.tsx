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

  // Type guard for verification status
  const verificationStatuses = new Set([
    "PENDING",
    "VERIFIED",
    "DISCREPANCY",
    "INCOMPLETE",
    "REJECTED",
  ] as const);

  type VerificationStatus = typeof Array.from(verificationStatuses)[number];

  function asVerificationStatus(v: unknown): VerificationStatus {
    if (typeof v === "string" && verificationStatuses.has(v as VerificationStatus)) {
      return v as VerificationStatus;
    }
    return "PENDING";
  }

  // Get all policies with key metadata
  // Note: verification_status column may not exist yet, so we query without it and set a default
  let policies: Array<{
    id: string,
    policy_number: string | null;
    policy_type: string | null;
    verification_status: string,
    updated_at: Date;
    createdAt: Date;
    client_id: string,
    client_firstName: string,
    client_lastName: string,
    client_email: string,
    insurer_id: string,
    insurer_name: string,
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
        p.createdAt,
        p.client_id,
        c.firstName as client_firstName,
        c.lastName as client_lastName,
        c.email as client_email,
        i.id as insurer_id,
        i.name as insurer_name,
        COUNT(DISTINCT d.id)::int as document_count
      FROM policies p
      INNER JOIN clients c ON c.id = p.client_id
      INNER JOIN insurers i ON i.id = p.insurer_id
      LEFT JOIN documents d ON d.policy_id = p.id
      GROUP BY p.id, p.policy_number, p.policy_type, p.verification_status, p.updated_at, p.createdAt, p.client_id, c.firstName, c.lastName, c.email, i.id, i.name
      ORDER BY p.updated_at DESC
      LIMIT 100
    `);
  } catch (error: unknown) {
    // If verification_status doesn't exist, query without it and set default
    const err = error as { code?: string, message?: string };
    if (err?.code === '42703' || err?.message?.includes('verification_status')) {
      policies = await prisma.$queryRawUnsafe(`
        SELECT 
          p.id,
          p.policy_number,
          p.policy_type,
          'PENDING' as verification_status,
          p.updated_at,
          p.createdAt,
          p.client_id,
          c.firstName as client_firstName,
          c.lastName as client_lastName,
          c.email as client_email,
          i.id as insurer_id,
          i.name as insurer_name,
          COUNT(DISTINCT d.id)::int as document_count
        FROM policies p
        INNER JOIN clients c ON c.id = p.client_id
        INNER JOIN insurers i ON i.id = p.insurer_id
        LEFT JOIN documents d ON d.policy_id = p.id
        GROUP BY p.id, p.policy_number, p.policy_type, p.updated_at, p.createdAt, p.client_id, c.firstName, c.lastName, c.email, i.id, i.name
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
    const err = error as { code?: string, message?: string };
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
        policyNumber: p.policy_number ?? undefined,
        policyType: p.policy_type ?? undefined,
        verificationStatus: asVerificationStatus(p.verification_status),
        updatedAt: p.updated_at,
        createdAt: p.createdAt,
        client: {
          id: p.client_id,
          firstName: p.client_firstName,
          lastName: p.client_lastName,
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
