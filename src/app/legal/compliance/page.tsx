import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Shield, Lock, CheckCircle, FileText, AlertTriangle } from "lucide-react";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata = genMeta({
  title: "Security & Compliance Standards",
  description:
    "HeirVault adheres to industry-leading security and compliance standards including NIST CSF, ISO/IEC 27001, SOC 2, CIS Controls, and GDPR. Learn about our security posture and compliance certifications.",
  path: "/legal/compliance",
  type: "article",
});

export default function CompliancePage() {
  return (
    <main className="min-h-screen bg-paper-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slateui-200 bg-paper-50/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition" aria-label="Return to homepage">
              <ArrowLeft className="h-5 w-5 text-slateui-600" aria-hidden="true" />
              <Logo size="sm" showTagline={false} className="flex-row" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <article className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="card p-6 sm:p-8 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-900">
                Security & Compliance Standards
              </h1>
              <p className="text-sm text-slateui-600 mt-1">Last updated: December 2024</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none space-y-8">
            <section>
              <p className="text-slateui-700 leading-relaxed text-lg">
                HeirVault is committed to maintaining the highest standards of security and compliance. 
                We adhere to industry-leading frameworks and regulations to protect your sensitive data 
                and ensure regulatory compliance.
              </p>
            </section>

            {/* NIST CSF */}
            <section className="border-l-4 border-blue-500 pl-6">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">
                    NIST Cybersecurity Framework (NIST CSF)
                  </h2>
                  <p className="text-slateui-700 leading-relaxed mb-3">
                    HeirVault implements the NIST Cybersecurity Framework to manage and reduce cybersecurity risk. 
                    Our security controls align with the five core functions:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li><strong>Identify:</strong> Asset management, risk assessment, and governance</li>
                    <li><strong>Protect:</strong> Access control, data security, and protective technology</li>
                    <li><strong>Detect:</strong> Continuous monitoring and anomaly detection</li>
                    <li><strong>Respond:</strong> Incident response planning and communication</li>
                    <li><strong>Recover:</strong> Recovery planning and improvements</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* ISO/IEC 27001 */}
            <section className="border-l-4 border-green-500 pl-6">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">
                    ISO/IEC 27001
                  </h2>
                  <p className="text-slateui-700 leading-relaxed mb-3">
                    Our Information Security Management System (ISMS) follows ISO/IEC 27001 standards, ensuring:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li>Systematic approach to managing sensitive information</li>
                    <li>Risk assessment and treatment processes</li>
                    <li>Continuous improvement of security controls</li>
                    <li>Regular security audits and reviews</li>
                    <li>Documented security policies and procedures</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* SOC 2 */}
            <section className="border-l-4 border-purple-500 pl-6">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">
                    SOC 2 (Service Organization Control 2)
                  </h2>
                  <p className="text-slateui-700 leading-relaxed mb-3">
                    HeirVault maintains SOC 2 Type II compliance, demonstrating our commitment to:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li><strong>Security:</strong> Protection against unauthorized access</li>
                    <li><strong>Availability:</strong> System availability and performance monitoring</li>
                    <li><strong>Processing Integrity:</strong> Accurate and complete data processing</li>
                    <li><strong>Confidentiality:</strong> Protection of confidential information</li>
                    <li><strong>Privacy:</strong> Collection, use, and disclosure of personal information</li>
                  </ul>
                  <p className="text-sm text-slateui-600 mt-3 italic">
                    SOC 2 reports are available to qualified customers under NDA.
                  </p>
                </div>
              </div>
            </section>

            {/* CIS Controls */}
            <section className="border-l-4 border-orange-500 pl-6">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">
                    CIS Critical Security Controls (CIS Controls)
                  </h2>
                  <p className="text-slateui-700 leading-relaxed mb-3">
                    We implement the CIS Critical Security Controls, focusing on:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li>Inventory and control of hardware and software assets</li>
                    <li>Continuous vulnerability management</li>
                    <li>Controlled use of administrative privileges</li>
                    <li>Secure configuration of systems and services</li>
                    <li>Maintenance and monitoring of audit logs</li>
                    <li>Email and web browser protections</li>
                    <li>Malware defenses and data recovery capabilities</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* GDPR */}
            <section className="border-l-4 border-indigo-500 pl-6">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">
                    GDPR (General Data Protection Regulation)
                  </h2>
                  <p className="text-slateui-700 leading-relaxed mb-3">
                    HeirVault complies with GDPR requirements for EU data subjects, including:
                  </p>
                  <ul className="list-disc list-inside text-slateui-700 space-y-2 ml-4">
                    <li><strong>Right to Access:</strong> Users can request copies of their personal data</li>
                    <li><strong>Right to Rectification:</strong> Users can correct inaccurate data</li>
                    <li><strong>Right to Erasure:</strong> Users can request deletion of their data</li>
                    <li><strong>Right to Data Portability:</strong> Users can export their data</li>
                    <li><strong>Privacy by Design:</strong> Privacy considerations built into our systems</li>
                    <li><strong>Data Processing Agreements:</strong> Contracts with all data processors</li>
                    <li><strong>Breach Notification:</strong> Timely notification of data breaches</li>
                  </ul>
                  <p className="text-sm text-slateui-600 mt-3">
                    For GDPR requests, contact: <a href="mailto:privacy@heirvault.app" className="text-indigo-600 hover:text-indigo-700 underline">privacy@heirvault.app</a>
                  </p>
                </div>
              </div>
            </section>

            {/* Security Measures */}
            <section>
              <h2 className="font-display text-2xl font-semibold text-ink-900 mb-4 flex items-center gap-2">
                <Lock className="h-6 w-6 text-ink-900" aria-hidden="true" />
                Additional Security Measures
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="card p-4">
                  <h3 className="font-semibold text-ink-900 mb-2">Encryption</h3>
                  <p className="text-sm text-slateui-600">
                    All data encrypted in transit (TLS 1.3) and at rest (AES-256)
                  </p>
                </div>
                <div className="card p-4">
                  <h3 className="font-semibold text-ink-900 mb-2">Access Controls</h3>
                  <p className="text-sm text-slateui-600">
                    Role-based access control (RBAC) and multi-factor authentication
                  </p>
                </div>
                <div className="card p-4">
                  <h3 className="font-semibold text-ink-900 mb-2">Audit Logging</h3>
                  <p className="text-sm text-slateui-600">
                    Comprehensive audit trails for all data access and modifications
                  </p>
                </div>
                <div className="card p-4">
                  <h3 className="font-semibold text-ink-900 mb-2">Regular Assessments</h3>
                  <p className="text-sm text-slateui-600">
                    Annual security assessments and penetration testing
                  </p>
                </div>
              </div>
            </section>

            {/* Compliance Contact */}
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink-900 mb-2">
                    Compliance Inquiries
                  </h2>
                  <p className="text-slateui-700 leading-relaxed mb-3">
                    For questions about our security and compliance posture, or to request compliance documentation:
                  </p>
                  <ul className="list-none text-slateui-700 space-y-2">
                    <li>
                      <strong>Email:</strong>{" "}
                      <a href="mailto:compliance@heirvault.app" className="text-blue-600 hover:text-blue-700 underline">
                        compliance@heirvault.app
                      </a>
                    </li>
                    <li>
                      <strong>Security:</strong>{" "}
                      <a href="mailto:security@heirvault.app" className="text-blue-600 hover:text-blue-700 underline">
                        security@heirvault.app
                      </a>
                    </li>
                    <li>
                      <strong>Privacy:</strong>{" "}
                      <a href="mailto:privacy@heirvault.app" className="text-blue-600 hover:text-blue-700 underline">
                        privacy@heirvault.app
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Related Links */}
            <section>
              <h2 className="font-display text-xl font-semibold text-ink-900 mb-4">Related Documents</h2>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/legal/privacy"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-ink-900 transition"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Privacy Policy
                </Link>
                <Link
                  href="/legal/terms"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-ink-900 transition"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Terms of Service
                </Link>
                <Link
                  href="/legal/disclaimers"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-ink-900 transition"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Disclaimers
                </Link>
              </div>
            </section>
          </div>
        </div>
      </article>
    </main>
  );
}
