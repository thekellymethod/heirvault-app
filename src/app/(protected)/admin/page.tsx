import { describeError, requireAdmin } from "@/lib/auth/guards";
import { AdminDashboard } from "./_components/AdminDashboard";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

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
    function toErrString(e: unknown): string {
      if (e instanceof Error) {
        return `${e.name}: ${e.message}\n${e.stack ?? ""}`;
      }
      try {
        return JSON.stringify(e, Object.getOwnPropertyNames(e as object));
      } catch {
        return String(e);
      }
    }

    const errorStatus =
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : null;

    const d = describeError(error);
    // One string line — Next dev overlay often renders object args as "{}"
    console.warn(
      `[AdminPage] requireAdmin failed${errorStatus != null ? ` HTTP ${errorStatus}` : ""}: ${d.summary}\n${toErrString(error)}`
    );

    const { userId } = await auth();

    if (!userId) {
      redirect("/admin/sign-in");
    }

    if (errorStatus === 403) {
      redirect("/admin/sign-in?error=not_admin");
    }
    if (errorStatus === 401) {
      redirect("/admin/sign-in?error=auth_failed");
    }
    redirect("/admin/sign-in?error=auth_failed");
  }
  
  // Render JSX outside of try/catch
  return <AdminDashboard admin={admin} />;
}
