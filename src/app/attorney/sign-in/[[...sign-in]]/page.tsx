"use client";

import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Attorney Sign In</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to your HeirVault account.
          </p>
        </div>

        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/attorney/sign-in"

            /* ✅ force post-auth redirect to your provisioning gate */
            afterSignInUrl="/attorney/sign-up/complete"
            redirectUrl="/attorney/sign-up/complete"
          />
        </div>
      </div>
    </div>
  );
}
