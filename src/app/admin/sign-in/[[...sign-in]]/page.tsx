"use client";

import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminSignInPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Check if user is admin, then redirect accordingly
      fetch("/api/debug/user-roles")
        .then((res) => res.json())
        .then((data) => {
          if (data.user?.roles?.includes("ADMIN")) {
            router.push("/admin");
          } else {
            // Not an admin, redirect to attorney dashboard
            router.push("/dashboard");
          }
        })
        .catch(() => {
          router.push("/dashboard");
        });
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading while checking auth
  if (!isLoaded || (isLoaded && isSignedIn)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center">
            <Logo size="lg" showTagline={false} className="flex-row" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Sign In</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to access the HeirVault administration dashboard.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Administrator access required
          </p>
        </div>

        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/admin/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/admin"
            redirectUrl="/admin"
            fallbackRedirectUrl="/admin"
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
                card: "shadow-none border-0 bg-transparent w-full",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "border border-slate-200 hover:bg-slate-50 transition",
                formButtonPrimary:
                  "bg-emerald-600 hover:bg-emerald-700 text-white transition",
                formButton: "w-full",
                formFieldInput:
                  "border border-slate-200 focus:border-emerald-600 focus:ring-emerald-600 rounded-md w-full",
                formFieldLabel: "text-slate-700 font-medium",
                formField: "w-full",
                footerActionLink:
                  "text-emerald-600 hover:text-emerald-700 transition",
                identityPreviewText: "text-slate-900",
                identityPreviewEditButton:
                  "text-emerald-600 hover:text-emerald-700 transition",
              },
            }}
          />
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-slate-500">
            Attorney?{" "}
            <a
              href="/attorney/sign-in"
              className="text-emerald-600 hover:text-emerald-700 font-medium underline"
            >
              Sign in here
            </a>
          </p>
          <a
            href="/"
            className="mt-4 inline-block text-sm text-slate-600 hover:text-slate-900 transition"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
