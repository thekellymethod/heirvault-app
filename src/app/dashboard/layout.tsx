import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/utils/clerk";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  try {
    await requireAuth("attorney");
  } catch (e: any) {
    if (e?.message === "Unauthorized") redirect("/sign-in");
    redirect("/client-portal");
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-slate-100">
      {children}
    </div>
  );
}
