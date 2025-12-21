import Link from "next/link";
import { CheckCircle, FileText, Clock } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function QRUpdateSuccessPage() {
  return (
    <main className="min-h-screen bg-paper-50 py-6 sm:py-12 overflow-x-hidden">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <Logo size="sm" showTagline={false} className="flex-row" href="/" />
          <Link
            href="/"
            className="text-sm font-medium text-slateui-600 hover:text-ink-900 transition"
          >
            Back to Home
          </Link>
        </div>

        <div className="card p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h1 className="font-display text-2xl font-bold text-ink-900 mb-3">
            Update Submitted Successfully
          </h1>
          
          <p className="text-slateui-600 mb-6">
            Your update has been recorded as a new version entry. Your complete history
            is preserved for reference and legal purposes.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-ink-900 mb-1">What Happens Next?</h3>
                <ul className="text-sm text-slateui-600 space-y-1 list-disc list-inside">
                  <li>Your update has been saved as a new version</li>
                  <li>Your attorney will be notified of the changes</li>
                  <li>You will receive a confirmation email shortly</li>
                  <li>All previous versions remain accessible for reference</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-gold-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-ink-900 mb-1">Version History</h3>
                <p className="text-sm text-slateui-600">
                  Each update creates a new version entry, preserving your complete historical chain.
                  This ensures continuity and provides an immutable record of all changes.
                </p>
              </div>
            </div>
          </div>

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

