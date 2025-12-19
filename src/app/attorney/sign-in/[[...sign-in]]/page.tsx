"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function AttorneySignInPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (user) router.replace("/attorney/sign-up/complete");
  }, [isLoaded, user, router]);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-md space-y-6 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Attorney Sign In</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to access your dashboard
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <SignIn
            signUpUrl="/attorney/sign-up"
            fallbackRedirectUrl="/attorney/sign-up/complete"
          />
        </div>

        <div className="text-center text-xs text-slate-500">
          Need an account?{" "}
          <Link
            href="/attorney/sign-up"
            className="font-medium text-emerald-600 hover:text-emerald-700"
          >
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
