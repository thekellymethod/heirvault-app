import { requireAdmin } from "@/lib/auth/guards";
import { AdminDashboard } from "./_components/AdminDashboard";
import { redirect } from "next/navigation";

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
  const admin = await requireAdmin().catch(() => null);

  if (!admin) {
    // Redirect to dedicated admin sign-in page
    redirect("/admin/sign-in");
  }

  return <AdminDashboard admin={admin} />;
}
