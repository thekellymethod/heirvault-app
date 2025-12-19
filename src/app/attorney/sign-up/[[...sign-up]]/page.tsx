"use client";

import { SignUp } from "@clerk/nextjs";

export default function Page() {
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

            /* ✅ the important part: force post-auth redirects */
            afterSignUpUrl="/attorney/sign-up/complete"
            redirectUrl="/attorney/sign-up/complete"
            fallbackRedirectUrl="/attorney/sign-up/complete"
          />
        </div>
      </div>
    </div>
  );
}
