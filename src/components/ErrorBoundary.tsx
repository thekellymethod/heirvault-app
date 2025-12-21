"use client";

import { Component, ReactNode } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { Shield, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * 
 * Catches React errors and displays a defensive error page
 * without leaking sensitive information.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging (server-side only, not exposed to client)
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <main className="min-h-screen flex items-center justify-center bg-paper-50 px-4 py-8">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <Logo size="sm" showTagline={false} className="flex-row justify-center" href="/" />
            </div>

            <div className="card p-8 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-10 w-10 text-red-600" />
              </div>

              <h1 className="font-display text-2xl font-bold text-ink-900 mb-3">
                Something Went Wrong
              </h1>

              <p className="text-slateui-600 mb-6">
                An unexpected error occurred. Please try again or contact support if the problem persists.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="btn-primary px-6 py-3"
                >
                  Reload Page
                </button>
                <Link href="/" className="btn-secondary px-6 py-3">
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

