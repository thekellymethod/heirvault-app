import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slateui-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-slate max-w-none space-y-8">
            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">1. Introduction</h2>
              <p className="text-slateui-700 leading-relaxed">
                HeirVault ("we," "our," or "us") operates a private, voluntary registry service that allows 
                clients to securely record their life insurance policy information and beneficiary designations. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">2. Information We Collect</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">2.1 Information You Provide</h3>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li>Client information (name, email, phone, date of birth)</li>
                    <li>Insurance policy information (insurer name, policy number, policy type)</li>
                    <li>Beneficiary information (name, relationship, contact information)</li>
                    <li>Organization and attorney account information</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">2.2 Automatically Collected Information</h3>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li>Usage data and analytics</li>
                    <li>Device information and IP addresses</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>To provide and maintain our registry service</li>
                <li>To facilitate authorized access by attorneys and authorized parties</li>
                <li>To process court orders and authorized information releases</li>
                <li>To send notifications and updates about your account</li>
                <li>To comply with legal obligations</li>
                <li>To improve our services and user experience</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">4. Information Sharing and Disclosure</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">4.1 Authorized Access</h3>
                  <p className="text-slateui-700 leading-relaxed mb-2">
                    Information in your registry may be accessed by:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li>Attorneys and law firms you have authorized</li>
                    <li>Authorized parties with proper legal documentation</li>
                    <li>Court-ordered releases with certified documentation</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">4.2 Legal Requirements</h3>
                  <p className="text-slateui-700 leading-relaxed mb-2">
                    We may disclose information when required by law, court order, or legal process, including:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li>Certified court orders for probate administration</li>
                    <li>Proof of direct heirship with supporting documentation (birth certificates, marriage certificates, etc.)</li>
                    <li>Subpoenas and other legal processes</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-ink-900 mb-2">4.3 Service Providers</h3>
                  <p className="text-slateui-700 leading-relaxed">
                    We may share information with trusted service providers who assist in operating our service, 
                    subject to confidentiality agreements.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">5. Data Security</h2>
              <p className="text-slateui-700 leading-relaxed">
                We implement industry-standard security measures to protect your information, including encryption, 
                secure authentication, and access controls. However, no method of transmission over the internet 
                is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">6. Your Rights</h2>
              <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                <li>Access and review your information</li>
                <li>Update or correct your information</li>
                <li>Request deletion of your information (subject to legal retention requirements)</li>
                <li>Revoke authorized access at any time</li>
                <li>Export your data</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">7. Data Retention</h2>
              <p className="text-slateui-700 leading-relaxed">
                We retain your information for as long as necessary to provide our services and comply with legal 
                obligations. You may request deletion of your account and data, subject to applicable legal 
                requirements for record retention.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">8. Children's Privacy</h2>
              <p className="text-slateui-700 leading-relaxed">
                Our service is not intended for individuals under 18 years of age. We do not knowingly collect 
                information from children.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">9. Changes to This Policy</h2>
              <p className="text-slateui-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes 
                by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4">10. Contact Us</h2>
              <p className="text-slateui-700 leading-relaxed">
                If you have questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:privacy@heirvault.com" className="text-gold-600 hover:text-gold-700 underline">
                  privacy@heirvault.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
