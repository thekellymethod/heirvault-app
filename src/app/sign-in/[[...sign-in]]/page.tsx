"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Disable autofill on Clerk input fields
  useEffect(() => {
    const disableAutofill = () => {
      // Find all input fields in the Clerk form
      const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]');
      inputs.forEach((input) => {
        (input as HTMLInputElement).setAttribute('autocomplete', 'off');
        (input as HTMLInputElement).setAttribute('autocapitalize', 'off');
        (input as HTMLInputElement).setAttribute('autocorrect', 'off');
        (input as HTMLInputElement).setAttribute('spellcheck', 'false');
        // For password fields, use 'new-password' which is more effective
        if ((input as HTMLInputElement).type === 'password') {
          (input as HTMLInputElement).setAttribute('autocomplete', 'new-password');
        }
      });
    };

    // Run immediately and also after a short delay to catch dynamically rendered fields
    disableAutofill();
    const timer = setTimeout(disableAutofill, 500);
    const observer = new MutationObserver(disableAutofill);
    
    // Observe the document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [isLoaded]);

  // Redirect if already signed in - preserve redirect URL if present
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get("redirect_url");
      if (redirectUrl && redirectUrl.startsWith("/")) {
        router.push(redirectUrl);
      } else {
        router.push("/dashboard");
      }
    }
  }, [isLoaded, isSignedIn, router]);

  // Add meta tags to prevent caching
  useEffect(() => {
    const metaTags = [
      { httpEquiv: 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
      { httpEquiv: 'Pragma', content: 'no-cache' },
      { httpEquiv: 'Expires', content: '0' },
    ];

    metaTags.forEach(({ httpEquiv, content }) => {
      let meta = document.querySelector(`meta[http-equiv="${httpEquiv}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('http-equiv', httpEquiv);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    });

    return () => {
      // Cleanup on unmount
      metaTags.forEach(({ httpEquiv }) => {
        const meta = document.querySelector(`meta[http-equiv="${httpEquiv}"]`);
        if (meta) {
          meta.remove();
        }
      });
    };
  }, []);

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
            Sign In
          </h1>
          <p className="text-sm text-slateui-600">
            Sign in to access your HeirVault dashboard
          </p>
          <p className="text-xs text-slateui-500 mt-2">
            For attorneys and administrators
          </p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="w-full">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/dashboard"
            afterSignInUrl="/dashboard"
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
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-slateui-500">
            {"Don't have an account?"}{" "}
            <Link href="/sign-up" className="text-ink-900 hover:text-ink-800 font-medium underline">
              Sign up here
            </Link>
          </p>
          <p className="text-xs text-slateui-500">
            Administrators: Sign in with your admin email to access the admin dashboard.
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
