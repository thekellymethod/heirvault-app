"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function AttorneySignUpCompletePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [tryingDashboard, setTryingDashboard] = React.useState(false);

  const handleTryDashboard = React.useCallback(async () => {
    if (!user) {
      router.push("/attorney/sign-in");
      return;
    }
    
    setTryingDashboard(true);
    try {
      // Check user's role to determine which dashboard to redirect to
      const checkRes = await fetch("/api/user/check-role", {
        credentials: "include",
        cache: "no-store",
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        
        // All accounts are attorney accounts - go to dashboard
        router.push("/dashboard");
      } else {
        // If check fails, try dashboard anyway
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error checking role:", error);
      // On error, try dashboard anyway
      router.push("/dashboard");
    }
  }, [user, router]);

  React.useEffect(() => {
    if (!isLoaded) return;

    async function ensureAttorneyRole() {
      try {
        // Wait a moment to ensure Clerk auth state is fully propagated
        await new Promise(resolve => setTimeout(resolve, 200));

        // All accounts are attorney accounts - set role and redirect
        // No need to check existing role since all accounts are attorney accounts

        // User doesn't have the role, set it
        setChecking(false);

        // Retry logic in case auth isn't ready yet
        let retries = 3;
        let lastError: Error | null = null;
        
        while (retries > 0) {
          try {
            const res = await fetch("/api/user/set-role", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: "attorney" }),
            });

            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Failed to set attorney role");
            }
            // If successful, break the loop
            break; 
          } catch (e) {
            lastError = e instanceof Error ? e : new Error("Unknown error during role set");
            console.error(`Attempt failed: ${lastError.message}. Retries left: ${retries - 1}`);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }

        if (lastError && retries === 0) {
          throw lastError;
        }

        // Wait a moment for the role to propagate, then redirect
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        setLoading(false);
      }
    }

    if (user) {
      ensureAttorneyRole();
    } else {
      setLoading(false);
      router.push("/attorney/sign-in");
    }
  }, [user, isLoaded, router]);

  if (!isLoaded || loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-600">
            {checking ? "Checking your account..." : "Setting up your attorney account..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="w-full max-w-md space-y-6 px-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-900">Error</h1>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleTryDashboard}
                disabled={tryingDashboard}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tryingDashboard ? "Loading..." : "Try Dashboard"}
              </button>
              <button
                onClick={() => router.push("/attorney/sign-in")}
                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

