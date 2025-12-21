"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Attorney Authentication Page
 * Public route for attorney login
 * 
 * Uses Clerk SignIn component
 * Redirects to dashboard after successful sign-in
 * Handles redirect_url parameter for post-login navigation
 */
export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Get redirect URL from query params or default to dashboard
      const redirectUrl = searchParams.get("redirect_url") || "/dashboard";
      router.push(redirectUrl);
    }
  }, [isLoaded, isSignedIn, router, searchParams]);

  // Show loading while checking auth or mounting
  if (!mounted || (isLoaded && isSignedIn)) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mb-6">
              <Logo size="lg" showTagline={false} className="flex-row" href="/" />
            </div>
            <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-slate-200 border-t-ink-900" />
          </div>
        </div>
      </main>
    );
  }

  // Get redirect URL for after sign-in
  const redirectUrl = searchParams.get("redirect_url") || "/dashboard";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <Logo size="lg" showTagline={false} className="flex-row" href="/" />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
            Attorney Sign In
          </h1>
          <p className="text-sm text-slateui-600">
            Sign in to access your HeirVault dashboard
          </p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="w-full">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/sign-up"
            fallbackRedirectUrl={redirectUrl}
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
                card: "shadow-none border-0 bg-transparent w-full",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border border-slateui-200 hover:bg-paper-100 transition",
                formButtonPrimary: "bg-ink-900 hover:bg-ink-800 text-white transition",
                formButton: "w-full",
                formFieldInput: "border border-slateui-200 focus:border-ink-900 focus:ring-ink-900 rounded-md w-full",
                formFieldLabel: "text-slateui-700 font-medium",
                formField: "w-full",
                footerActionLink: "text-ink-900 hover:text-ink-800 transition",
                identityPreviewText: "text-ink-900",
                identityPreviewEditButton: "text-ink-900 hover:text-ink-800 transition",
              },
            }}
          />
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slateui-500">
            Don't have an account?{" "}
            <Link href="/sign-up" className="text-ink-900 hover:text-ink-800 font-medium underline">
              Sign up here
            </Link>
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-slateui-600 hover:text-ink-900 transition"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
