"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function AttorneySignUpCompletePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const didRun = React.useRef(false);

  const [status, setStatus] = React.useState<"working" | "error">("working");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.replace("/attorney/sign-in");
      return;
    }

    if (didRun.current) return;
    didRun.current = true;

    (async () => {
      try {
        setStatus("working");
        setError(null);

        const res = await fetch("/api/user/provision", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error ?? `Provision failed (${res.status})`);
        }

        window.location.href = "/dashboard";
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Provision failed");
      }
    })();
  }, [isLoaded, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-md space-y-6 px-6 text-center">
        {status === "working" && (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
            <h1 className="text-xl font-semibold text-slate-900">
              Setting up your attorney account...
            </h1>
            <p className="text-sm text-slate-600">This should only take a moment.</p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold text-slate-900">Setup didn’t complete</h1>
            <p className="text-sm text-slate-600">{error ?? "Unknown error."}</p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Retry
              </button>
              <button
                onClick={() => router.replace("/attorney/sign-in")}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
