import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export default function AttorneyAgreementPage() {
  return (
    <main className="min-h-screen bg-paper-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slateui-200 bg-paper-50/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
              <ArrowLeft className="h-5 w-5 text-slateui-600" />
              <Logo size="sm" showTagline={false} className="flex-row" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="card p-6 sm:p-8 md:p-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900 mb-2">HeirVault</h1>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-900 mb-2">Attorney Platform Use Agreement</h2>
          <p className="text-sm text-slateui-600 mb-8">Last Updated: December 23, 2025</p>

          <div className="prose prose-slate max-w-none space-y-8">
            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">Attorney Acknowledgments</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                Attorneys acknowledge:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>No completeness guarantee</li>
                <li>No discovery representation</li>
                <li>Independent duty to verify</li>
                <li>Logged and auditable access</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">Access Terms</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                Attorney access is:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>Purpose-limited</li>
                <li>Case-specific authorization</li>
                <li>Subject to verification</li>
                <li>Fully auditable</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">Consequences</h2>
              <p className="text-slateui-700 leading-relaxed">
                Misuse results in immediate revocation.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">Contact</h2>
              <p className="text-slateui-700 leading-relaxed">
                For questions regarding attorney access, please contact{" "}
                <a href="mailto:legal@heirvault.com" className="text-gold-600 hover:text-gold-700 underline font-semibold">
                  legal@heirvault.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

