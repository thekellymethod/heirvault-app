import Link from "next/link";
import { Logo } from "@/components/Logo";
import { XCircle } from "lucide-react";

/**
 * Not Found Page
 * 
 * Defensive 404 page that doesn't leak information
 */
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo size="sm" showTagline={false} className="flex-row justify-center" href="/" />
        </div>

        <div className="card p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slateui-100">
            <XCircle className="h-10 w-10 text-slateui-400" />
          </div>

          <h1 className="font-display text-2xl font-bold text-ink-900 mb-3">
            Page Not Found
          </h1>

          <p className="text-slateui-600 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="btn-primary px-6 py-3">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

