"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function AttorneySignUpPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // If already signed in, immediately go to provisioning
  useEffect(() => {
    if (!isLoaded) return;
    if (user) {
      router.replace("/attorney/sign-up/complete");
    }
  }, [isLoaded, user, router]);

  // While Clerk loads or redirecting
  if (!isLoaded || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />
          <p className="text-sm text-slate-600">Checking your account...</p>
        </div>
      </div>
    );
  }

  // Not signed in → show sign-up
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-md space-y-6 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Attorney Sign Up</h1>
          <p className="mt-2 text-sm text-slate-600">
            Create your account to start managing client registries
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <SignUp
            signInUrl="/attorney/sign-in"
            fallbackRedirectUrl="/attorney/sign-up/complete"
          />
        </div>

        <div className="text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link
            href="/attorney/sign-in"
            className="font-medium text-emerald-600 hover:text-emerald-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
