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
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    // Log the error for debugging with proper serialization
    function toErrString(e: unknown): string {
      if (e instanceof Error) {
        return `${e.name}: ${e.message}\n${e.stack ?? ""}`;
      }
      try {
        return JSON.stringify(e, null, 2);
      } catch {
        return String(e);
      }
    }
    
    const errorStatus = error instanceof Error && "status" in error ? (error as { status: number }).status : null;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = toErrString(error);
    
    console.error("[AdminPage] Error in requireAdmin:", errorDetails);
    console.error("[AdminPage] Error details:", {
      message: errorMessage,
      status: errorStatus,
      fullError: errorDetails,
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
  
  // Render JSX outside of try/catch
  return <AdminDashboard admin={admin} />;
}
