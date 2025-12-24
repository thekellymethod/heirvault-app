import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
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
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-900 mb-2">Terms of Service</h2>
          <p className="text-sm text-slateui-600 mb-8">Last Updated: December 23, 2025</p>

          <div className="prose prose-slate max-w-none space-y-8">
            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-slateui-700 leading-relaxed">
                By accessing or using HeirVault (&quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">2. Nature of the Service</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                HeirVault is a <strong>private, voluntary digital registry</strong> that allows users to record life insurance policy information for <strong>authorized access</strong> in connection with estate planning and probate administration.
              </p>
              <p className="text-slateui-700 leading-relaxed mb-4">
                HeirVault:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>Is <strong>not</strong> an insurer</li>
                <li>Is <strong>not</strong> a regulator</li>
                <li>Is <strong>not</strong> a government agency</li>
                <li>Is <strong>not</strong> a discovery or policy-location service</li>
              </ul>
              <p className="text-slateui-700 leading-relaxed mt-4">
                Participation is voluntary and not required by law.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">3. User Responsibilities</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                Users are solely responsible for:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>Accuracy of uploaded information</li>
                <li>Maintaining current records</li>
                <li>Granting and revoking access</li>
                <li>Understanding that the registry is not comprehensive</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">4. Information Release</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                Information may be released only pursuant to:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>Certified court orders</li>
                <li>Verified proof of death and heirship</li>
                <li>Authorized attorney access with legal basis</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">5. Prohibited Uses</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                Users may not:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>Misrepresent HeirVault as official or mandatory</li>
                <li>Use data for solicitation or marketing</li>
                <li>Upload false or misleading information</li>
                <li>Attempt unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">6. Intellectual Property</h2>
              <p className="text-slateui-700 leading-relaxed">
                All platform content is owned by HeirVault and protected by law.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">7. Limitation of Liability</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                The Service is provided &quot;as is.&quot;
              </p>
              <p className="text-slateui-700 leading-relaxed">
                HeirVault makes no guarantees regarding completeness, discovery, accuracy, or availability.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">8. Indemnification</h2>
              <p className="text-slateui-700 leading-relaxed">
                Users agree to indemnify HeirVault against claims arising from misuse.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">9. Termination</h2>
              <p className="text-slateui-700 leading-relaxed">
                HeirVault may suspend or terminate access for violations.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">10. Governing Law</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                Texas law governs. Venue lies exclusively in Texas courts.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
