import { requireAdmin, requireAuth } from "@/lib/auth/guards";
import { canViewAudit } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { AuditView } from "./_components/AuditView";

interface Props {
  searchParams: Promise<{
    action?: string;
    registryId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}

/**
 * Audit Trail Page
 * 
 * Server Component
 * Read-only
 * 
 * - requireAdmin() OR allow ATTORNEY with canViewAudit check
 * - If attorney and canViewAudit returns false, deny access
 * - Fetch access logs with filters
 * - Display table: time, user, action, registryId, metadata
 * - No edits. Read-only.
 */
export default async function AuditPage({ searchParams }: Props) {
  // Check access: requireAdmin() OR allow ATTORNEY with canViewAudit
  let hasAccess = false;
  let user;
  
  try {
    // Try requireAdmin first (admins have full access)
    user = await requireAdmin();
    hasAccess = true;
  } catch {
    // If not admin, check if attorney with canViewAudit
    try {
      user = await requireAuth();
      // Check if user has ATTORNEY role and canViewAudit permission
      hasAccess = canViewAudit({ user });
    } catch {
      // Not authenticated
      redirect("/sign-in");
    }
  }

  // If access denied (attorney with canViewAudit false), redirect to access denied
  if (!hasAccess) {
    redirect("/error?type=insufficient_role&reason=Access to audit logs is restricted");
  }

  const params = await searchParams;

  // Extract filter parameters
  const actionFilter = params.action;
  const registryIdFilter = params.registryId;
  const userIdFilter = params.userId;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 50;

  // TODO: Implement getAccessLogs() function in /lib/db.ts
  // For now, using stub that returns empty array
  // In production, this would query the access_logs table with filters:
  // - Filter by action if provided
  // - Filter by registryId if provided
  // - Filter by userId if provided
  // - Filter by date range if provided
  // - Apply pagination (limit, offset)
  // - Order by timestamp DESC
  // - Join with users table to get user email/name
  const logs: Array<{
    id: string;
    timestamp: Date;
    userId: string | null;
    userEmail?: string | null;
    userName?: string | null;
    action: string;
    registryId: string;
    metadata: Record<string, unknown> | null;
  }> = [];

  // Stub implementation - in production, this would be:
  // const logs = await getAccessLogs({
  //   action: actionFilter,
  //   registryId: registryIdFilter,
  //   userId: userIdFilter,
  //   startDate,
  //   endDate,
  //   limit: pageSize,
  //   offset,
  // });

  const totalCount = 0; // Stub - would be actual count from query

  return (
    <AuditView
      logs={logs}
      totalCount={totalCount}
      currentPage={page}
      pageSize={pageSize}
      filters={{
        action: actionFilter || "",
        registryId: registryIdFilter || "",
        userId: userIdFilter || "",
        startDate: params.startDate || "",
        endDate: params.endDate || "",
      }}
    />
  );
}
