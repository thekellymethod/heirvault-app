import { requireAttorney } from "@/lib/auth";
import { db, accessLogs, registryRecords, users, sql, desc, eq, and, type AccessLogAction } from "@/lib/db";
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
 * Protected route - requires authentication
 * 
 * Server Component
 * Read-only
 * Filterable logs
 * Exportable (PDF later)
 * 
 * This is where credibility lives.
 */
export default async function AuditPage({ searchParams }: Props) {
  // Require attorney authentication
  const user = await requireAttorney();

  const params = await searchParams;
  
  // Extract filter parameters
  const actionFilter = params.action;
  const registryIdFilter = params.registryId;
  const userIdFilter = params.userId;
  const startDate = params.startDate ? new Date(params.startDate) : null;
  const endDate = params.endDate ? new Date(params.endDate) : null;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  // Build filter conditions
  const conditions = [];

  if (actionFilter) {
    conditions.push(eq(accessLogs.action, actionFilter as AccessLogAction));
  }

  if (registryIdFilter) {
    conditions.push(eq(accessLogs.registryId, registryIdFilter));
  }

  if (userIdFilter) {
    conditions.push(eq(accessLogs.userId, userIdFilter));
  }

  if (startDate) {
    conditions.push(sql`${accessLogs.timestamp} >= ${startDate}`);
  }

  if (endDate) {
    // Add one day to include the entire end date
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    conditions.push(sql`${accessLogs.timestamp} < ${endDatePlusOne}`);
  }

  // Fetch access logs with registry and user information
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const logsResult = await db.select({
    id: accessLogs.id,
    registryId: accessLogs.registryId,
    userId: accessLogs.userId,
    action: accessLogs.action,
    metadata: accessLogs.metadata,
    timestamp: accessLogs.timestamp,
    decedentName: registryRecords.decedentName,
    userEmail: users.email,
    userFirstName: users.firstName,
    userLastName: users.lastName,
  })
    .from(accessLogs)
    .leftJoin(registryRecords, eq(accessLogs.registryId, registryRecords.id))
    .leftJoin(users, eq(accessLogs.userId, users.id))
    .where(whereClause)
    .orderBy(desc(accessLogs.timestamp))
    .limit(pageSize)
    .offset(offset);

  // Type the metadata properly
  const logs = logsResult.map((log) => ({
    ...log,
    metadata: (log.metadata as Record<string, unknown> | null) || null,
  }));

  // Get total count for pagination
  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int as count
    FROM access_logs
    ${whereClause ? sql`WHERE ${whereClause}` : sql``}
  `);
  const totalCount = (countResult.rows[0] as { count: number })?.count || 0;

  // Get unique values for filters
  const actionsResult = await db.execute(sql`
    SELECT DISTINCT action
    FROM access_logs
    ORDER BY action
  `);
  const availableActions = (actionsResult.rows || []).map((row: Record<string, unknown>) => row.action as string);

  return (
    <AuditView
      logs={logs}
      totalCount={totalCount}
      currentPage={page}
      pageSize={pageSize}
      availableActions={availableActions}
      filters={{
        action: actionFilter || "",
        registryId: registryIdFilter || "",
        userId: userIdFilter || "",
        startDate: params.startDate || "",
        endDate: params.endDate || "",
      }}
      user={user}
    />
  );
}
