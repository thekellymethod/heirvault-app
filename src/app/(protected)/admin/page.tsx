import { requireAdmin } from "@/lib/auth/guards";
import { AdminDashboard } from "./_components/AdminDashboard";
import { AdminSignIn } from "./_components/AdminSignIn";

/**
 * Administration Page
 * Protected route - requires admin authentication
 * 
 * Only admins
 * Approvals, credential reviews, compliance
 * 
 * Exit criteria: You can reconstruct "who did what when" for any record.
 */
export default async function AdminPage() {
  try {
    // Require admin authentication
    const admin = await requireAdmin();
    return <AdminDashboard admin={admin} />;
  } catch (error: any) {
    // If not authenticated or not admin, show sign-in page
    return <AdminSignIn />;
  }
}
