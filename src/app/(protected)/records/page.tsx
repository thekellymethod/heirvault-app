import { requireVerifiedAttorneyWithClerkId } from "@/lib/auth/guards";
import { listAuthorizedRegistries, getRegistryVersions } from "@/lib/db";
import { logAccess } from "@/lib/audit";
import { RecordsListView } from "./_components/RecordsListView";

/**
 * Registry Records List Page
 * Protected route - requires authentication
 * 
 * Server Component
 * Calls requireVerifiedAttorneyWithClerkId()
 * Fetch authorized registries
 * Table view with status filtering
 * Audit: DASHBOARD_VIEW (list view)
 */
export default async function RecordsPage() {
  // Require verified attorney authentication
  const user = await requireVerifiedAttorneyWithClerkId();

  // Fetch only registries this user has permission to access
  const authorizedRegistries = await listAuthorizedRegistries(user.clerkId, 100);
  
  // Transform to RegistrySummary format
  const registries = await Promise.all(
    authorizedRegistries.map(async (registry) => {
      const versions = await getRegistryVersions(registry.id);
      const latestVersion = versions.length > 0 ? versions[0] : null;
      
      return {
        id: registry.id,
        decedentName: registry.insured_name,
        status: registry.status,
        createdAt: new Date(registry.created_at),
        latestVersion: latestVersion
          ? {
              id: latestVersion.id,
              createdAt: new Date(latestVersion.created_at),
              submittedBy: latestVersion.submitted_by,
            }
          : null,
        versionCount: versions.length,
        lastUpdated: latestVersion ? new Date(latestVersion.created_at) : null,
      };
    })
  );

  // Log records list view (legal backbone - every route handler must call this)
  // Audit: DASHBOARD_VIEW (list view of records)
  await logAccess({
    userId: user.id,
    registryId: null, // System-wide list view
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
