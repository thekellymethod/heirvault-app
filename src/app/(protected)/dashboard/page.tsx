import { requireAttorney } from "@/lib/auth";
import { getAllRegistries, logAccess } from "@/lib/db";
import { DashboardView } from "./_components/DashboardView";

/**
 * Attorney Dashboard
 * Protected route - requires authentication
 * 
 * Server Component
 * Calls requireAttorney()
 * Fetch authorized registries
 * Display summaries only
 */
export default async function DashboardPage() {
  // Require attorney authentication
  const user = await requireAttorney();

  // Fetch all authorized registries
  // For now, all attorneys have global access (Phase 0)
  // Future: Filter by organization or explicit access grants
  const allRegistries = await getAllRegistries();
  
  // Filter by authorization (for now, all are authorized)
  // Future: Use getAuthorizedRegistryIds(user.id) to filter
  const registries = allRegistries; // All attorneys see all registries in Phase 0

  // Log dashboard access (legal backbone - every route handler must call this)
  // Audit: DASHBOARD_VIEW
  await logAccess({
    registryId: "dashboard", // Special identifier for dashboard views
    userId: user.id,
    action: "DASHBOARD_VIEW",
    metadata: {
      source: "dashboard_page",
      registryCount: registries.length,
      viewType: "list",
      authorizedCount: registries.length,
    },
  });

  return (
    <DashboardView
      registries={registries}
      user={user}
    />
  );
}
