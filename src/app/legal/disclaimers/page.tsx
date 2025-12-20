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
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900 mb-2">Legal Disclaimers</h1>
          <p className="text-sm text-slateui-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-slate max-w-none space-y-8">
            <section className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
              <h2 className="font-display text-2xl font-semibold text-red-900 mb-4">⚠️ Critical Disclaimers</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-red-900 mb-2">Not a Regulator or Insurer</h3>
                  <p className="text-red-800 leading-relaxed">
                    HeirVault is <strong>NOT</strong> a regulator, insurer, or government agency. We are a private, 
                    voluntary registry service. We do not regulate insurance companies, issue policies, or have 
                    any regulatory authority.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-red-900 mb-2">Not Mandatory or Official</h3>
                  <p className="text-red-800 leading-relaxed">
                    Use of HeirVault is <strong>completely voluntary</strong> and is not required by law. This registry 
                    is <strong>not an official record</strong> and does not claim to be comprehensive, authoritative, 
                    or mandatory.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-red-900 mb-2">No Guarantees</h3>
                  <p className="text-red-800 leading-relaxed mb-2">
                    HeirVault does <strong>NOT guarantee</strong>:
                  </p>
                  <ul className="list-disc list-inside text-red-800 space-y-1 ml-4">
                    <li>Complete coverage of all policies</li>
                    <li>Policy discovery or location services</li>
                    <li>That all policies will be found</li>
                    <li>Accuracy of information provided by users</li>
                    <li>That policies exist or are valid</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-red-900 mb-2">Not Affiliated</h3>
                  <p className="text-red-800 leading-relaxed">
                    HeirVault is <strong>not affiliated with</strong> any insurer, regulator, government agency, 
                    the National Association of Insurance Commissioners (NAIC), or the Medical Information Bureau (MIB).
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">Service Description</h2>
              <div className="bg-slateui-50 border border-slateui-200 rounded-lg p-4">
                <p className="text-slateui-700 leading-relaxed mb-2">
                  HeirVault is a <strong>private, voluntary registry</strong> that:
                </p>
                <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                  <li>Allows users to <strong>voluntarily upload</strong> their life insurance policy information</li>
                  <li>Provides <strong>secure, authorized access</strong> to registered information</li>
                  <li><strong>Facilitates discovery</strong> of policy information for estate planning and probate purposes</li>
                  <li>Enables <strong>authorized releases</strong> with proper legal documentation</li>
                </ul>
                <p className="text-slateui-700 leading-relaxed mt-2">
                  HeirVault does <strong>not</strong> locate policies, search insurer databases, or provide policy 
                  discovery services. Users must voluntarily register their own policy information.
                </p>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">Positioning Relative to NAIC</h2>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">What NAIC Does:</h3>
                  <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm ml-4">
                    <li>Regulates insurers</li>
                    <li>Maintains consumer tools</li>
                    <li>Does not operate a comprehensive policy registry</li>
                  </ul>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">HeirVault's Position:</h3>
                  <ul className="list-disc list-inside text-green-800 space-y-1 text-sm ml-4">
                    <li>We are <strong>not a regulator</strong></li>
                    <li>We are <strong>not an insurer</strong></li>
                    <li>We are <strong>not mandatory or authoritative</strong></li>
                    <li>We are a <strong>private registry</strong> with <strong>voluntary upload</strong></li>
                    <li>We provide <strong>authorized access</strong> only</li>
                    <li>We are <strong>not affiliated</strong> with any insurer or regulator</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">Positioning Relative to MIB</h2>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">What MIB Actually Is:</h3>
                  <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm ml-4">
                    <li>A cooperative data exchange</li>
                    <li>Focused on underwriting risk, not beneficiaries</li>
                    <li>Closed system with insurer-only access</li>
                    <li>Does not help beneficiaries locate policies</li>
                    <li>Does not serve probate or estates</li>
                  </ul>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">HeirVault's Differentiation:</h3>
                  <ul className="list-disc list-inside text-green-800 space-y-1 text-sm ml-4">
                    <li><strong>Estate-side</strong>, not underwriting-side</li>
                    <li><strong>Beneficiary access</strong>, not insurer access</li>
                    <li><strong>Post-death utility</strong>, not pre-policy risk assessment</li>
                    <li>Serves beneficiaries and estates, not insurers</li>
                    <li>Facilitates probate and estate administration</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">Information Release Process</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">Certified Court Orders</h3>
                  <p className="text-slateui-700 leading-relaxed mb-2">
                    HeirVault will release registry information in response to:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li>Certified court orders for probate administration</li>
                    <li>Certified court orders for estate administration</li>
                    <li>Properly authenticated legal documents from courts of competent jurisdiction</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">Proof of Direct Heirship</h3>
                  <p className="text-slateui-700 leading-relaxed mb-2">
                    Information may be released to individuals who provide:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li><strong>Certified death certificate</strong> of the registry holder (REQUIRED)</li>
                    <li>Valid proof of direct heirship (birth certificates, marriage certificates, etc.)</li>
                    <li>Proper identification and verification</li>
                    <li>Completed authorization forms</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">Global Database Access</h3>
                  <p className="text-slateui-700 leading-relaxed mb-2">
                    Licensed attorneys may access the global registry database (across all organizations) when:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li><strong>Certified death certificate</strong> is provided and verified (REQUIRED)</li>
                    <li>Proper attorney credentials and verification</li>
                    <li>Valid legal basis for the search (probate, estate administration, etc.)</li>
                    <li>All searches are logged for audit and compliance purposes</li>
                  </ul>
                  <p className="text-slateui-700 leading-relaxed mt-2 text-sm">
                    <strong>Note:</strong> Global database access searches the private, voluntary registry across 
                    all participating organizations. This is not a comprehensive database and only includes 
                    information that has been voluntarily registered. This service facilitates discovery but 
                    does not locate policies on your behalf.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">Standardized Release Method</h3>
                  <p className="text-slateui-700 leading-relaxed">
                    All information releases follow a standardized, documented process that requires proper 
                    documentation, verification, and authorization. This process ensures compliance with 
                    legal requirements and protects user privacy.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">Regulatory Compliance</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-2">Language Discipline</h3>
                <p className="text-amber-800 text-sm leading-relaxed mb-2">
                  HeirVault strictly adheres to the following language guidelines to ensure regulatory compliance:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1 text-sm">❌ We DO NOT claim:</h4>
                    <ul className="list-disc list-inside text-amber-800 space-y-1 text-xs ml-2">
                      <li>"Complete coverage of all policies"</li>
                      <li>"Official record"</li>
                      <li>"Required by law"</li>
                      <li>"Guaranteed policy discovery"</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1 text-sm">✅ We DO say:</h4>
                    <ul className="list-disc list-inside text-amber-800 space-y-1 text-xs ml-2">
                      <li>"Registry"</li>
                      <li>"Voluntary"</li>
                      <li>"Secure"</li>
                      <li>"Authorized access"</li>
                      <li>"Facilitates discovery"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">User Responsibility</h2>
              <p className="text-slateui-700 leading-relaxed mb-2">
                Users are solely responsible for:
              </p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>The accuracy of information they upload to the registry</li>
                <li>Ensuring all registered policies are included</li>
                <li>Keeping registry information up to date</li>
                <li>Authorizing appropriate access to their information</li>
                <li>Understanding that this is a voluntary registry, not a comprehensive database</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">No Legal Advice</h2>
              <p className="text-slateui-700 leading-relaxed">
                HeirVault does not provide legal, financial, or insurance advice. Users should consult with 
                qualified attorneys, financial advisors, or insurance professionals for advice regarding their 
                specific situation.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">Contact for Information Releases</h2>
              <p className="text-slateui-700 leading-relaxed">
                For information about the standardized release process, certified court orders, or proof of 
                heirship requirements, please contact us at{" "}
                <a href="mailto:legal@heirvault.com" className="text-gold-600 hover:text-gold-700 underline">
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
