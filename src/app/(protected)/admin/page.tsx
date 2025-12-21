import { requireAdmin } from "@/lib/auth";
import { AdminDashboard } from "./_components/AdminDashboard";

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
  // Require admin authentication
  const admin = await requireAdmin();

  return <AdminDashboard admin={admin} />;
}
