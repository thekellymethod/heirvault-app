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
              <Logo size="sm" showTagline={false} className="flex-row gap-2" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="card p-6 sm:p-8 md:p-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-slateui-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-slate max-w-none space-y-8">
            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-slateui-700 leading-relaxed">
                By accessing or using HeirVault ("Service"), you agree to be bound by these Terms of Service. 
                If you disagree with any part of these terms, you may not access the Service.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">2. Description of Service</h2>
              <div className="space-y-4">
                <p className="text-slateui-700 leading-relaxed">
                  HeirVault is a <strong>private, voluntary registry service</strong> that allows users to securely 
                  record and manage life insurance policy information and beneficiary designations. 
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">Important Disclaimers:</h3>
                  <ul className="list-disc list-inside text-amber-800 space-y-1 text-sm">
                    <li>HeirVault is <strong>not affiliated with</strong> any insurer, regulator, or government agency</li>
                    <li>HeirVault is <strong>not a regulator</strong> and does not regulate insurance companies</li>
                    <li>HeirVault is <strong>not an insurer</strong> and does not issue insurance policies</li>
                    <li>Use of this service is <strong>voluntary</strong> and not required by law</li>
                    <li>This registry is <strong>not an official record</strong> and does not claim to be comprehensive</li>
                    <li>We do <strong>not guarantee</strong> policy discovery or coverage of all policies</li>
                    <li>This service <strong>facilitates discovery</strong> but does not locate policies on your behalf</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">3. User Accounts and Responsibilities</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">3.1 Account Creation</h3>
                  <p className="text-slateui-700 leading-relaxed">
                    You are responsible for maintaining the confidentiality of your account credentials and for all 
                    activities that occur under your account.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">3.2 Accurate Information</h3>
                  <p className="text-slateui-700 leading-relaxed">
                    You agree to provide accurate, current, and complete information when using the Service. 
                    You are solely responsible for the information you upload to the registry.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">3.3 Authorized Access</h3>
                  <p className="text-slateui-700 leading-relaxed">
                    You control who has access to your registry information. You may grant or revoke access to 
                    attorneys, law firms, or other authorized parties at any time.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">4. Information Release and Court Orders</h2>
              <div className="space-y-4">
                <p className="text-slateui-700 leading-relaxed">
                  HeirVault may release registry information in the following circumstances:
                </p>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">4.1 Certified Court Orders</h3>
                  <p className="text-slateui-700 leading-relaxed mb-2">
                    We will comply with certified court orders for probate administration or estate administration, 
                    provided the order:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li>Is issued by a court of competent jurisdiction</li>
                    <li>Is properly certified and authenticated</li>
                    <li>Specifies the information requested and legal basis</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">4.2 Proof of Direct Heirship</h3>
                  <p className="text-slateui-700 leading-relaxed mb-2">
                    We may release information to individuals who provide:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li><strong>Certified death certificate</strong> of the registry holder (REQUIRED)</li>
                    <li>Valid proof of direct heirship (birth certificates, marriage certificates, etc.)</li>
                    <li>Proper identification and verification</li>
                    <li>Completed authorization forms</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">4.3 Global Database Access</h3>
                  <p className="text-slateui-700 leading-relaxed mb-2">
                    Licensed attorneys may access the global registry database (across all organizations) for 
                    probate and estate administration purposes when:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li><strong>Certified death certificate</strong> is provided and verified (REQUIRED)</li>
                    <li>Attorney credentials are verified</li>
                    <li>Valid legal basis exists (probate case, estate administration, etc.)</li>
                    <li>All access is logged for audit and compliance purposes</li>
                  </ul>
                  <p className="text-slateui-700 leading-relaxed mt-2 text-sm italic">
                    The global database is a private, voluntary registry that aggregates information from 
                    participating organizations. It is not comprehensive and only includes voluntarily 
                    registered information.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">4.4 Standardized Release Process</h3>
                  <p className="text-slateui-700 leading-relaxed">
                    All information releases follow a standardized process that requires proper documentation, 
                    verification, and authorization. Contact us for information about the release process.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">5. Relationship to NAIC and MIB</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">Positioning Statement</h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                  HeirVault is <strong>not affiliated with</strong> the National Association of Insurance Commissioners (NAIC) 
                  or the Medical Information Bureau (MIB). We are a private, voluntary registry service that operates 
                  independently and serves a different purpose than these organizations.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">5.1 NAIC (National Association of Insurance Commissioners)</h3>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li>NAIC regulates insurers and maintains consumer tools</li>
                    <li>NAIC does not operate a comprehensive policy registry</li>
                    <li>HeirVault is not a regulator, insurer, or mandatory service</li>
                    <li>HeirVault is a private, voluntary registry for estate planning purposes</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">5.2 MIB Group (Medical Information Bureau)</h3>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li>MIB is a cooperative data exchange focused on underwriting risk</li>
                    <li>MIB does not help beneficiaries locate policies</li>
                    <li>MIB serves insurers, not beneficiaries or estates</li>
                    <li>HeirVault serves estate-side needs, not underwriting-side needs</li>
                    <li>HeirVault provides beneficiary access, not insurer access</li>
                    <li>HeirVault serves post-death utility, not pre-policy risk assessment</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">6. Prohibited Uses</h2>
              <p className="text-slateui-700 leading-relaxed mb-2">You agree not to:</p>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Upload false, misleading, or fraudulent information</li>
                <li>Attempt to gain unauthorized access to other users' information</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Use the Service to violate any laws or regulations</li>
                <li>Claim that HeirVault is official, mandatory, or comprehensive</li>
                <li>Misrepresent the nature or capabilities of the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">7. Intellectual Property</h2>
              <p className="text-slateui-700 leading-relaxed">
                The Service and its original content, features, and functionality are owned by HeirVault and are 
                protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">8. Limitation of Liability</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm leading-relaxed">
                  <strong>IMPORTANT:</strong> HeirVault is provided "as is" without warranties of any kind. 
                  We do not guarantee:
                </p>
                <ul className="list-disc list-inside text-red-800 space-y-1 text-sm mt-2 ml-4">
                  <li>Complete coverage of all policies</li>
                  <li>Policy discovery or location services</li>
                  <li>Accuracy of information provided by users</li>
                  <li>Availability or uninterrupted access to the Service</li>
                </ul>
                <p className="text-red-800 text-sm leading-relaxed mt-2">
                  To the maximum extent permitted by law, HeirVault shall not be liable for any indirect, 
                  incidental, special, or consequential damages arising from your use of the Service.
                </p>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">9. Indemnification</h2>
              <p className="text-slateui-700 leading-relaxed">
                You agree to indemnify and hold harmless HeirVault, its officers, directors, employees, and agents 
                from any claims, damages, losses, liabilities, and expenses arising from your use of the Service 
                or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">10. Termination</h2>
              <p className="text-slateui-700 leading-relaxed">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, 
                for any breach of these Terms. You may also terminate your account at any time.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">11. Changes to Terms</h2>
              <p className="text-slateui-700 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of material changes. 
                Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">12. Governing Law</h2>
              <p className="text-slateui-700 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the United States, 
                without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">13. Contact Information</h2>
              <p className="text-slateui-700 leading-relaxed">
                If you have questions about these Terms of Service, please contact us at{" "}
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
