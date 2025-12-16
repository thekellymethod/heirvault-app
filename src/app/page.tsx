"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#0D1117] text-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-4xl">
        <div className="rounded-2xl border border-slate-800 bg-[#111827]/40 p-8 shadow">
          <h1 className="text-3xl font-semibold tracking-tight">
            HeirVault
          </h1>
          <p className="mt-3 text-slate-300 max-w-2xl">
            A private, attorney-led insurance registry that keeps beneficiary data out of
            the policy layer, and keeps your client workflows tight.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => router.push("/role-router")}>
              Start for attorneys
            </Button>
            <Button variant="outline" size="lg" onClick={() => router.push("/role-router")}>
              Client login
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
