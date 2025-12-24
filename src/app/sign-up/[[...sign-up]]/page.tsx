"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading while checking auth
  if (!isLoaded || (isLoaded && isSignedIn)) {
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <Logo size="lg" showTagline={false} className="flex-row" href="/" />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">
            Attorney Sign Up
          </h1>
          <p className="text-sm text-slateui-600">
            Create your account to access your HeirVault dashboard
          </p>
        </div>

        {/* Clerk Sign Up Component */}
        <div className="w-full">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/dashboard"
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
            Already have an account?{" "}
            <Link href="/sign-in" className="text-ink-900 hover:text-ink-800 font-medium underline">
              Sign in here
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

