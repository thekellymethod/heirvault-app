import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { ComplianceDashboard } from "./_components/ComplianceDashboard";

export const runtime = "nodejs";

export default async function CompliancePage() {
  try {
    // Require admin access - redirect if not admin
    await requireAdmin();
  } catch (error) {
    // Redirect to dashboard if not admin
    redirect("/dashboard");
  }

  return <ComplianceDashboard />;
}

