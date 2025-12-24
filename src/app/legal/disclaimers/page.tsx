import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export default function LegalDisclaimersPage() {
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
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-900 mb-2">Legal Disclaimer & Limitations of Service</h2>
          <p className="text-sm text-slateui-600 mb-8">Last Updated: December 23, 2025</p>

          <div className="prose prose-slate max-w-none space-y-8">
            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">1. Nature of the Service</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                HeirVault is a <strong>private, voluntary digital registry</strong> that allows individuals to <strong>voluntarily record life insurance policy information</strong> for future reference by authorized parties.
              </p>
              <p className="text-slateui-700 leading-relaxed mb-4">
                HeirVault is <strong>not</strong> a regulator, insurer, government agency, or public authority.
                HeirVault does <strong>not</strong> issue insurance policies, regulate insurance companies, or exercise any governmental or regulatory authority.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">2. Not an Official or Mandatory Registry</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                Use of HeirVault is <strong>entirely voluntary</strong>.
              </p>
              <p className="text-slateui-700 leading-relaxed">
                HeirVault is <strong>not required by law</strong>, is <strong>not an official record</strong>, and does <strong>not claim to be comprehensive, authoritative, or mandatory</strong> for any purpose, including probate, estate administration, or insurance claims.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">3. No Guarantees or Representations</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                HeirVault makes <strong>no guarantees</strong>, representations, or warranties regarding:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>The existence, validity, or enforceability of any insurance policy</li>
                <li>The completeness or accuracy of registry information</li>
                <li>The discovery or location of unregistered policies</li>
                <li>The accuracy of information uploaded by users or third parties</li>
                <li>The identification of beneficiaries or entitlement to proceeds</li>
              </ul>
              <p className="text-slateui-700 leading-relaxed mt-4">
                All information stored within HeirVault is <strong>user-provided</strong> and <strong>voluntarily submitted</strong>.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">4. No Policy Discovery or Investigation Services</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                HeirVault does <strong>not</strong>:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>Search insurer databases</li>
                <li>Locate unregistered insurance policies</li>
                <li>Investigate or confirm policy existence</li>
                <li>Communicate with insurance carriers on a user&apos;s behalf</li>
              </ul>
              <p className="text-slateui-700 leading-relaxed mt-4">
                HeirVault <strong>facilitates access to information voluntarily registered within its private registry only</strong>.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">5. No Affiliation With Insurers or Regulators</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                HeirVault is <strong>not affiliated with</strong>, endorsed by, or connected to:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>Any insurance company or carrier</li>
                <li>Any state or federal regulatory authority</li>
                <li>The National Association of Insurance Commissioners (NAIC)</li>
                <li>The Medical Information Bureau (MIB)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">6. Positioning Relative to NAIC and MIB</h2>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-ink-900 mb-3">NAIC</h3>
                <p className="text-slateui-700 leading-relaxed mb-4">
                  The NAIC regulates insurers and provides consumer tools.
                  It does <strong>not</strong> operate a comprehensive policy registry.
                </p>
                <p className="text-slateui-700 leading-relaxed mb-4">
                  HeirVault is:
                </p>
                <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                  <li>Not a regulator</li>
                  <li>Not authoritative</li>
                  <li>Not mandatory</li>
                  <li>A private registry based on voluntary user participation</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-ink-900 mb-3">MIB</h3>
                <p className="text-slateui-700 leading-relaxed mb-4">
                  The MIB is a cooperative underwriting database used by insurers.
                  It is not accessible to beneficiaries and does not serve probate or estate administration.
                </p>
                <p className="text-slateui-700 leading-relaxed mb-4">
                  HeirVault differs by:
                </p>
                <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                  <li>Serving estates and beneficiaries, not insurers</li>
                  <li>Operating post-death, not underwriting-related</li>
                  <li>Providing authorized access based on legal documentation</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">7. Information Release Policy (Summary)</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                HeirVault may, <strong>in its sole discretion</strong>, release registry information <strong>only after verification</strong> and <strong>only to authorized parties</strong>, including:
              </p>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-ink-900 mb-3">A. Court-Ordered Releases</h3>
                <p className="text-slateui-700 leading-relaxed mb-2">
                  Upon receipt and verification of:
                </p>
                <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                  <li>Certified court orders issued by courts of competent jurisdiction in probate or estate matters</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-ink-900 mb-3">B. Heirship-Based Requests</h3>
                <p className="text-slateui-700 leading-relaxed mb-2">
                  Upon receipt and verification of:
                </p>
                <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                  <li>Certified death certificate of the registry holder (required)</li>
                  <li>Valid proof of direct heirship (e.g., birth or marriage certificates)</li>
                  <li>Proper identification and completed authorization forms</li>
                </ul>
              </div>

              <p className="text-slateui-700 leading-relaxed">
                HeirVault reserves the right to <strong>deny or delay any release</strong> pending verification or for legal, security, or compliance reasons.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">8. Attorney Access to Registry Information</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                Licensed attorneys may, subject to verification and authorization, <strong>search registry entries voluntarily registered by users across participating organizations</strong>, when:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>A certified death certificate is provided and verified</li>
                <li>Attorney credentials are validated</li>
                <li>A legitimate legal basis exists (e.g., probate or estate administration)</li>
              </ul>
              <p className="text-slateui-700 leading-relaxed mt-4">
                All searches are logged and auditable.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <p className="text-amber-900 font-semibold mb-2">Important:</p>
                <p className="text-amber-800 text-sm leading-relaxed">
                  The registry is <strong>not comprehensive</strong> and includes <strong>only voluntarily registered information</strong>.
                </p>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">9. User Responsibilities</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                Users are solely responsible for:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>The accuracy and completeness of all information they submit</li>
                <li>Ensuring all relevant policies are registered</li>
                <li>Keeping information current</li>
                <li>Understanding that HeirVault is a voluntary registry, not a discovery service</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">10. No Legal, Financial, or Insurance Advice</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                HeirVault does <strong>not</strong> provide legal, financial, or insurance advice.
              </p>
              <p className="text-slateui-700 leading-relaxed mb-4">
                Users acknowledge that they <strong>do not rely on HeirVault</strong> for:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>Legal determinations</li>
                <li>Policy validation</li>
                <li>Beneficiary verification</li>
                <li>Entitlement decisions</li>
              </ul>
              <p className="text-slateui-700 leading-relaxed mt-4">
                Users should consult licensed attorneys, financial advisors, or insurance professionals regarding their specific circumstances.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">11. Governing Law and Venue</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                This Disclaimer and all use of the HeirVault platform are governed by the laws of the <strong>State of Texas</strong>, without regard to conflict-of-law principles.
              </p>
              <p className="text-slateui-700 leading-relaxed">
                Any legal action arising from or relating to HeirVault shall be brought <strong>exclusively in the state or federal courts located within the State of Texas</strong>, and users consent to such jurisdiction and venue.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">12. Professional Non-Advice Disclaimer</h2>
              <p className="text-slateui-700 leading-relaxed mb-4">
                HeirVault does not provide legal, insurance, financial, or tax advice.
              </p>
              <p className="text-slateui-700 leading-relaxed mb-4">
                Use of the Service creates <strong>no fiduciary, advisory, or attorney-client relationship</strong>.
              </p>
              <p className="text-slateui-700 leading-relaxed">
                Users must consult qualified professionals for advice regarding their specific circumstances.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">13. Contact Information</h2>
              <p className="text-slateui-700 leading-relaxed">
                For questions regarding information release procedures, documentation requirements, or compliance matters, contact:
              </p>
              <p className="text-slateui-700 leading-relaxed mt-4">
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
