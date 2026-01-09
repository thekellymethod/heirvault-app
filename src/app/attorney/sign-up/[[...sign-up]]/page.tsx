"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");

  // Redirect if already signed in (but only after auth is loaded)
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading while checking auth
  if (!isLoaded || (isLoaded && isSignedIn)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-500 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Attorney Sign Up</h1>
          <p className="mt-2 text-sm text-slate-600">
            Create your account to access HeirVault.
          </p>
        </div>

        <div className="flex justify-center">
          <SignUp
            routing="path"
            path="/attorney/sign-up"
            signInUrl="/attorney/sign-in"
            afterSignUpUrl="/onboarding"
            redirectUrl="/onboarding"
            initialValues={
              emailParam
                ? {
                    emailAddress: emailParam,
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
