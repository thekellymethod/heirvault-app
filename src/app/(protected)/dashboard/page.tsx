import { requireAttorney } from "@/lib/auth";
import { getAllRegistries } from "@/lib/db";
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

  // Fetch all authorized registries (for now, all attorneys have global access)
  const registries = await getAllRegistries();

  return (
    <DashboardView
      registries={registries}
      user={user}
    />
  );
}
