"use client";

import { SignIn, SignOutButton, useAuth } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, AlertCircle, ArrowLeft, LogOut } from "lucide-react";

export default function AdminSignInPage() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [showSignInForm, setShowSignInForm] = useState(true);
  const hasCheckedRef = useRef(false); // Prevent multiple checks

  // Check for error parameter in URL
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "auth_failed") {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setAdminCheckError("Authentication failed. There may be a database error. Please try signing out and signing in again.");
        setShowSignInForm(false);
        hasCheckedRef.current = true; // Prevent auto-check
      }, 0);
    } else if (errorParam === "not_admin") {
      setTimeout(() => {
        setAdminCheckError("This account does not have administrator privileges. Check the diagnostic page for details.");
        setShowSignInForm(false);
        hasCheckedRef.current = true; // Prevent auto-check
      }, 0);
    }
  }, [searchParams]);

  // Check admin status if already signed in, but don't auto-redirect immediately
  useEffect(() => {
    // Skip if we've already checked or if there's an error
    if (hasCheckedRef.current || adminCheckError) {
      return;
    }

    if (isLoaded && isSignedIn) {
      hasCheckedRef.current = true; // Mark as checked to prevent loops
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setIsCheckingAdmin(true);
      }, 0);
      // Check if user is admin
      fetch("/api/debug/whoami")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setIsCheckingAdmin(false);
          if (data.isAdmin) {
            // User is admin - redirect to admin dashboard (not console)
            router.push("/admin");
          } else {
            // Not an admin - show error but allow them to sign out and try again
            setAdminCheckError("This account does not have administrator privileges.");
            setShowSignInForm(false);
          }
        })
        .catch((error) => {
          setIsCheckingAdmin(false);
          console.error("[AdminSignIn] Error checking admin status:", error);
          // Check if it's a database/creation error
          const errorMessage = error?.message || String(error);
          const isDbError = errorMessage.includes("database") || 
                           errorMessage.includes("create") || 
                           errorMessage.includes("insert") ||
                           errorMessage.includes("DB");
          
          if (isDbError) {
            setAdminCheckError("Database error occurred while creating your account. Please contact support or try signing out and signing in again.");
          } else {
            setAdminCheckError("Unable to verify admin status. Please try signing out and signing in again.");
          }
          setShowSignInForm(false);
        });
    } else if (isLoaded && !isSignedIn) {
      // Not signed in - show sign-in form
      setShowSignInForm(true);
      setAdminCheckError(null);
      hasCheckedRef.current = false; // Reset when signed out
    }
  }, [isLoaded, isSignedIn, adminCheckError, router]);

  // Show loading while checking auth
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show checking admin status
  if (isSignedIn && isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-600">Verifying administrator access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Admin Badge Header */}
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <Logo size="xl" showTagline={false} className="flex-row" />
              <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <Shield className="h-3 w-3" />
                ADMIN
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm border-2 border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-red-600" />
              <h1 className="text-3xl font-bold text-slate-900">Administrator Sign In</h1>
            </div>
            <p className="text-sm text-slate-700 font-medium mb-2">
              HeirVault Administration Dashboard
            </p>
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 font-medium">
              ⚠️ Administrator access required. This page is for system administrators only.
            </p>
          </div>
        </div>

        {/* Show error if non-admin signed in */}
        {isSignedIn && adminCheckError && (
          <div className="bg-white rounded-lg shadow-xl border-2 border-red-200 p-6 mb-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Administrator Access Required</h2>
              <p className="text-sm text-slate-600 mb-4">{adminCheckError}</p>
              <p className="text-xs text-slate-500 mb-4">
                Please sign out and sign in with an administrator account.
              </p>
              <div className="space-y-2">
                <a
                  href="/api/debug/admin-diagnostic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  View Diagnostic Information →
                </a>
                <SignOutButton redirectUrl="/admin/sign-in">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold transition shadow-md hover:shadow-lg">
                    <LogOut className="h-4 w-4" />
                    Sign Out and Try Again
                  </button>
                </SignOutButton>
              </div>
            </div>
          </div>
        )}

        {/* Clerk Sign In Component - Always show when not signed in, or when signed in but not admin */}
        {(!isSignedIn || (isSignedIn && adminCheckError)) && (
          <div className="bg-white rounded-lg shadow-xl border-2 border-red-100 p-6">
            {isSignedIn && adminCheckError && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700 font-medium">
                  ⚠️ You&apos;re signed in with a non-admin account. Sign out below to use a different account (including social login).
                </p>
              </div>
            )}
            <SignIn
              routing="path"
              path="/admin/sign-in"
              signUpUrl="/sign-up"
              afterSignInUrl="/admin"
              redirectUrl="/admin"
              fallbackRedirectUrl="/admin"
              forceRedirectUrl="/admin"
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full",
                  card: "shadow-none border-0 bg-transparent w-full",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton:
                    "border border-red-200 hover:bg-red-50 transition text-slate-700",
                  formButtonPrimary:
                    "bg-red-600 hover:bg-red-700 text-white transition shadow-md hover:shadow-lg",
                  formButton: "w-full",
                  formFieldInput:
                    "border border-red-200 focus:border-red-600 focus:ring-red-600 rounded-md w-full",
                  formFieldLabel: "text-slate-700 font-medium",
                  formField: "w-full",
                  footerActionLink:
                    "text-red-600 hover:text-red-700 transition font-medium",
                  identityPreviewText: "text-slate-900",
                  identityPreviewEditButton:
                    "text-red-600 hover:text-red-700 transition",
                },
              }}
            />
            {isSignedIn && adminCheckError && (
              <div className="mt-4 pt-4 border-t border-red-100">
                <SignOutButton redirectUrl="/admin/sign-in">
                  <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 text-sm font-medium transition">
                    <LogOut className="h-4 w-4" />
                    Sign Out to Use Different Account
                  </button>
                </SignOutButton>
              </div>
            )}
          </div>
        )}

        {/* Show sign out option if signed in as admin (shouldn't happen, but just in case) */}
        {isSignedIn && !adminCheckError && !isCheckingAdmin && (
          <div className="bg-white rounded-lg shadow-xl border-2 border-red-100 p-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-4">
                You're already signed in. Redirecting to admin dashboard...
              </p>
              <SignOutButton redirectUrl="/admin/sign-in">
                <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 text-sm font-medium transition">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </SignOutButton>
            </div>
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-6 text-center space-y-3">
          <div className="bg-white/60 backdrop-blur-sm border border-red-100 rounded-lg p-4">
            <p className="text-xs text-slate-600 mb-2">
              Not an administrator?
            </p>
            <Link
              href="/attorney/sign-in"
              className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 font-medium transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Go to Attorney Sign In
            </Link>
          </div>
          
          <Link
            href="/"
            className="inline-block text-xs text-slate-500 hover:text-slate-700 transition"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
