import { requireAdmin } from "@/lib/auth/guards";
import { AdminDashboard } from "./_components/AdminDashboard";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

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
    const admin = await requireAdmin();
    return <AdminDashboard admin={admin} />;
  } catch (error) {
    // Log the error for debugging
    const errorStatus = error instanceof Error && "status" in error ? (error as { status: number }).status : null;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error("[AdminPage] Error in requireAdmin:", {
      message: errorMessage,
      status: errorStatus,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Check if user is authenticated at all
    const { userId } = await auth();
    
    if (!userId) {
      // Not authenticated - redirect to sign-in
      redirect("/admin/sign-in");
    }
    
    // User is authenticated but either:
    // 1. Not an admin (403) - most common case
    // 2. Database error during user creation (500)
    // 3. Other error
    
    // Provide helpful error message based on status code
    if (errorStatus === 403) {
      // Not an admin - provide diagnostic link
      console.error("[AdminPage] User is authenticated but not an admin. Check /api/debug/admin-diagnostic for details.");
      redirect("/admin/sign-in?error=not_admin");
    } else if (errorStatus === 401) {
      // Authentication issue
      redirect("/admin/sign-in?error=auth_failed");
    } else {
      // Other error (database, etc.)
      console.error("[AdminPage] Unexpected error:", errorMessage);
      redirect("/admin/sign-in?error=auth_failed");
    }
  }
}
