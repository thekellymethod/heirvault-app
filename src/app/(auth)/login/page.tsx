"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { redirect } from "next/navigation";

export default function LoginPage() {
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
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ 
            display: "inline-block",
            width: "32px",
            height: "32px",
            border: "4px solid #e2e8f0",
            borderTopColor: "#1e293b",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          <p style={{ marginTop: "16px", color: "#64748b" }}>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Attorney Login</h1>
      <div style={{ marginTop: 16 }}>
        <SignIn 
          routing="path"
          path="/login"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </main>
  );
}
