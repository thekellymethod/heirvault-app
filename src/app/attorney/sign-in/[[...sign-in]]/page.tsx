"use client";

import * as React from "react";
import { SignIn, useUser, SignOutButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function AttorneySignInPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleGoToDashboard = React.useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
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
          router.push("/dashboard");
        } else if (checkData.dbRole === "client") {
          // User is a client, go to client portal
          router.push("/client-portal");
        } else {
          // User doesn't have a role set yet, complete the attorney sign-in flow
          router.push("/attorney/sign-in/complete");
        }
      } else {
        // If check fails, try to go to complete page to set role
        router.push("/attorney/sign-in/complete");
      }
    } catch (error) {
      console.error("Error checking role:", error);
      // On error, try to go to complete page
      router.push("/attorney/sign-in/complete");
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  // If user is already signed in, show option to sign out or go to dashboard
  if (isLoaded && user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="w-full max-w-md space-y-6 px-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Already Signed In</h1>
            <p className="mt-2 text-sm text-slate-600">
              You are currently signed in as {user.emailAddresses[0]?.emailAddress}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <button
              onClick={handleGoToDashboard}
              disabled={loading}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Go to Dashboard"}
            </button>
            <div className="flex items-center justify-center">
              <SignOutButton>
                <button className="text-sm text-slate-600 hover:text-slate-900 underline">
                  Sign out to use a different account
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-md space-y-6 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Attorney Sign In</h1>
          <p className="mt-2 text-sm text-slate-600">
            Access your firm dashboard to manage clients, policies, and beneficiaries
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <SignIn 
            signUpUrl="/attorney/sign-up"
            fallbackRedirectUrl="/attorney/sign-in/complete"
          />
        </div>
        <div className="text-center text-xs text-slate-500">
          Don't have an account?{" "}
          <a href="/attorney/sign-up" className="font-medium text-emerald-600 hover:text-emerald-700">
            Sign up as attorney
          </a>
        </div>
      </div>
    </div>
  );
}
