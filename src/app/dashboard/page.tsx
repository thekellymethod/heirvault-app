import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/utils/clerk";
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
  const { userId } = await requireAuth();

  // Get all policies with key metadata
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

  // Get summary statistics
  const stats = await prisma.$queryRawUnsafe<Array<{
    total_policies: number;
    pending_verification: number;
    verified: number;
    discrepancy: number;
    total_clients: number;
  }>>(`
    SELECT 
      COUNT(DISTINCT p.id)::int as total_policies,
      COUNT(DISTINCT CASE WHEN p.verification_status = 'PENDING' THEN p.id END)::int as pending_verification,
      COUNT(DISTINCT CASE WHEN p.verification_status = 'VERIFIED' THEN p.id END)::int as verified,
      COUNT(DISTINCT CASE WHEN p.verification_status = 'DISCREPANCY' THEN p.id END)::int as discrepancy,
      COUNT(DISTINCT c.id)::int as total_clients
    FROM policies p
    INNER JOIN clients c ON c.id = p.client_id
  `);

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
        verificationStatus: p.verification_status as any,
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
