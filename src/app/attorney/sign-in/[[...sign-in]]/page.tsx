"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scale, ArrowLeft } from "lucide-react";

export default function Page() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading while checking auth or if already signed in
  if (!isLoaded || (isLoaded && isSignedIn)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-500 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center">
            <Logo size="xl" showTagline={false} className="flex-row" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Scale className="h-6 w-6 text-slate-700" />
            <h1 className="text-3xl font-bold text-slate-900">Attorney Sign In</h1>
          </div>
          <p className="text-sm text-slate-600">
            Sign in to access your HeirVault attorney dashboard
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6">
          <SignIn
            routing="path"
            path="/attorney/sign-in"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
                card: "shadow-none border-0 bg-transparent w-full",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "border border-slate-200 hover:bg-slate-50 transition",
                formButtonPrimary:
                  "bg-slate-900 hover:bg-slate-800 text-white transition shadow-md hover:shadow-lg",
                formButton: "w-full",
                formFieldInput:
                  "border border-slate-200 focus:border-slate-900 focus:ring-slate-900 rounded-md w-full",
                formFieldLabel: "text-slate-700 font-medium",
                formField: "w-full",
                footerActionLink:
                  "text-slate-900 hover:text-slate-800 transition font-medium",
                identityPreviewText: "text-slate-900",
                identityPreviewEditButton:
                  "text-slate-900 hover:text-slate-800 transition",
              },
            }}
          />
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-slate-500">
            Administrator?{" "}
            <a
              href="/admin/sign-in"
              className="text-slate-900 hover:text-slate-700 font-medium underline"
            >
              Sign in here
            </a>
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
