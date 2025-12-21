import { requireAttorney } from "@/lib/auth";
import { getAllRegistries, logAccess } from "@/lib/db";
import { RecordsListView } from "./_components/RecordsListView";

/**
 * Registry Records List Page
 * Protected route - requires authentication
 * 
 * Server Component
 * Calls requireAttorney()
 * Fetch authorized registries
 * Table view with status filtering
 * Audit: DASHBOARD_VIEW (list view)
 */
export default async function RecordsPage() {
  // Require attorney authentication
  const user = await requireAttorney();

  // Fetch all authorized registries
  // For now, all attorneys have global access (Phase 0)
  // Future: Filter by organization or explicit access grants
  const allRegistries = await getAllRegistries();
  
  // Filter by authorization (for now, all are authorized)
  // Future: Use getAuthorizedRegistryIds(user.id) to filter
  const registries = allRegistries; // All attorneys see all registries in Phase 0

  // Log records list view (legal backbone - every route handler must call this)
  // Audit: DASHBOARD_VIEW (list view of records)
  await logAccess({
    registryId: "records_list", // Special identifier for records list views
    userId: user.id,
    action: "DASHBOARD_VIEW",
    metadata: {
      source: "records_list_page",
      registryCount: registries.length,
      viewType: "table",
      authorizedCount: registries.length,
    },
  });

  return (
    <RecordsListView
      registries={registries}
      user={user}
    />
  );
}
