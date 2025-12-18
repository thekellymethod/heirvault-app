"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function AttorneySignInCompletePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [redirected, setRedirected] = React.useState(false);
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
        
        if (checkData.hasAttorneyRole) {
          // User has attorney or admin role, go to attorney dashboard
          window.location.href = "/dashboard";
        } else if (checkData.dbRole === "client") {
          // User is a client, go to client portal
          window.location.href = "/client-portal";
        } else {
          // User doesn't have a role set yet, stay on complete page
          setError("Please complete the sign-in process to set your role.");
          setTryingDashboard(false);
        }
      } else {
        // If check fails, try dashboard anyway
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Error checking role:", error);
      // On error, try dashboard anyway
      window.location.href = "/dashboard";
    }
  }, [user, router]);

  React.useEffect(() => {
    if (!isLoaded || redirected) return;

    async function ensureAttorneyRole() {
      try {
        // Wait a moment to ensure Clerk auth state is fully propagated
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Check current role from API (checks both Clerk and DB)
        let checkRes;
        try {
          checkRes = await fetch("/api/user/check-role", {
            credentials: "include",
            cache: "no-store",
          });
        } catch (fetchError) {
          console.error("Failed to fetch check-role:", fetchError);
          // If fetch fails, try to set the role anyway
          setChecking(false);
          // Continue to role setting logic below
          checkRes = null;
        }
        
        if (checkRes?.ok) {
          try {
            const checkData = await checkRes.json();
            if (checkData.hasAttorneyRole) {
              // User already has attorney role, redirect immediately
              setRedirected(true);
              // Use window.location for a hard redirect to ensure fresh data
              window.location.href = "/dashboard";
              return;
            }
          } catch (jsonError) {
            console.error("Failed to parse check-role response:", jsonError);
            // Continue to role setting logic
          }
        }

        // User doesn't have the role, set it
        setChecking(false);
        
        // Retry logic in case auth isn't ready yet
        let retries = 3;
        let lastError: Error | null = null;
        
        while (retries > 0) {
          try {
            let res;
            try {
              res = await fetch("/api/user/set-role", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify({ role: "attorney" }),
              });
            } catch (fetchError) {
              console.error(`Fetch error (attempt ${4 - retries}):`, fetchError);
              if (retries > 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                retries--;
                continue;
              }
              throw new Error("Network error: Failed to connect to server");
            }

            if (res.ok) {
              // Wait for role to propagate, then verify it's set
              await new Promise(resolve => setTimeout(resolve, 800)); // Increased wait time
              
              // Verify the role was actually set
              let verifyRetries = 5;
              while (verifyRetries > 0 && !redirected) {
                try {
                  const verifyRes = await fetch("/api/user/check-role", {
                    credentials: "include",
                    cache: "no-store",
                  });
                  
                  if (verifyRes.ok) {
                    try {
                      const verifyData = await verifyRes.json();
                      if (verifyData.hasAttorneyRole) {
                        // Role is confirmed, redirect to dashboard
                        setRedirected(true);
                        // Use window.location for a hard redirect to ensure fresh data
                        window.location.href = "/dashboard";
                        return;
                      }
                    } catch (jsonError) {
                      console.error("Failed to parse verify response:", jsonError);
                    }
                  }
                } catch (verifyError) {
                  console.error(`Verify error (attempt ${6 - verifyRetries}):`, verifyError);
                  // Continue to retry
                }
                
                // Wait a bit more and retry verification
                await new Promise(resolve => setTimeout(resolve, 400));
                verifyRetries--;
              }
              
              // If we get here, role might be set but not verified - try dashboard anyway
              if (!redirected) {
                setRedirected(true);
                // Use window.location for a hard redirect to ensure fresh data
                window.location.href = "/dashboard";
              }
              return;
            }
            
            const data = await res.json().catch(() => ({}));
            lastError = new Error(data.error || `Failed to set attorney role (${res.status})`);
            
            // If it's a 401, wait and retry (auth might not be ready)
            if (res.status === 401 && retries > 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
              retries--;
              continue;
            }
            
            throw lastError;
          } catch (e) {
            lastError = e instanceof Error ? e : new Error("Unknown error");
            if (retries > 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
              retries--;
            } else {
              throw lastError;
            }
          }
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        console.error("Error in ensureAttorneyRole:", e);
        setError(errorMessage.includes("Failed to fetch") || errorMessage.includes("Network error")
          ? "Unable to connect to server. Please check your internet connection and try again."
          : errorMessage);
        setLoading(false);
      }
    }

    if (user) {
      ensureAttorneyRole();
    } else {
      // User not loaded yet, wait a bit more
      setTimeout(() => {
        if (!user && !redirected) {
          setLoading(false);
          router.replace("/attorney/sign-in");
        }
      }, 1000);
    }
  }, [user, isLoaded, router, redirected]);

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
                Sign In Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

