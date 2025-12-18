"use client";

import * as React from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function ClientLoginPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const mode = searchParams.get("mode") || "sign-in";
  const redirectUrl = token ? `/invite/${token}` : "/client-portal";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-md space-y-6 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Client Portal</h1>
          <p className="mt-2 text-sm text-slate-600">
            {token 
              ? "Sign in to accept your invitation and access your registry"
              : "Sign in to view and manage your policies and beneficiaries"
            }
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {mode === "sign-up" ? (
            <SignUp 
              signInUrl="/client/login"
              fallbackRedirectUrl={redirectUrl}
            />
          ) : (
            <SignIn 
              signUpUrl="/client/login?mode=sign-up"
              fallbackRedirectUrl={redirectUrl}
            />
          )}
        </div>
        <div className="text-center text-xs text-slate-500">
          {mode === "sign-up" ? (
            <>
              Already have an account?{" "}
              <a href="/client/login" className="font-medium text-emerald-600 hover:text-emerald-700">
                Sign in
              </a>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <a href="/client/login?mode=sign-up" className="font-medium text-emerald-600 hover:text-emerald-700">
                Create account
              </a>
            </>
          )}
        </div>
        {token && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            You've been invited to complete your registry. After signing in, you'll be able to accept the invitation.
          </div>
        )}
      </div>
    </div>
  );
}

