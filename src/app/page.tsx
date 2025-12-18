"use client";

import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";

function StarsRow({ rating = 4.5, reviews = 121 }: { rating?: number; reviews?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="flex items-center gap-2">
        <div className="flex text-gold-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-5 w-5 fill-current" />
          ))}
        </div>
        <span className="text-base font-semibold text-ink-900">{rating.toFixed(1)}</span>
        <span className="text-base text-slateui-600">| {reviews} Reviews</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper-50 text-slateui-800">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slateui-200 bg-paper-50/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <Logo size="sm" showTagline={false} className="flex-row gap-3" />

            <nav className="hidden md:flex items-center gap-7">
              <Link href="#home" className="text-sm font-medium text-slateui-800 hover:text-ink-900 transition">
                Home
              </Link>
              <Link href="#how-it-works" className="text-sm font-medium text-slateui-800 hover:text-ink-900 transition">
                How It Works
              </Link>
              <Link href="#resources" className="text-sm font-medium text-slateui-800 hover:text-ink-900 transition">
                Resources
              </Link>
              <Link href="#faq" className="text-sm font-medium text-slateui-800 hover:text-ink-900 transition">
                FAQ
              </Link>
              <Link href="#contact" className="text-sm font-medium text-slateui-800 hover:text-ink-900 transition">
                Contact
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/attorney/sign-up"
                className="hidden sm:inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold
                           border border-slateui-200 bg-white/70 text-ink-900 hover:bg-white transition"
              >
                For Attorneys
              </Link>

              <Link
                href="/client/invite-code"
                className="btn-primary inline-flex items-center justify-center px-4 py-2 text-sm"
              >
                Client Invitation
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="home" className="relative overflow-hidden bg-hero-radial">
        {/* background image */}
        <div className="absolute inset-0">
          <Image
            src="/world-hv.png"
            alt="World map background"
            fill
            priority
            className="object-cover opacity-25"
            sizes="100vw"
          />
        </div>

        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-900/80 to-ink-950/75" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Copy */}
            <div className="text-center md:text-left">
              <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-paper-100/90">
                Secure policy discovery for families & estate professionals
              </p>

              <h1 className="mt-6 font-display text-4xl md:text-6xl leading-[1.05] tracking-tight text-white">
                Find Unclaimed Life Insurance Policies Easily
              </h1>

              <p className="mt-6 text-base md:text-lg leading-relaxed text-paper-100/80 max-w-xl mx-auto md:mx-0">
                HeirVault helps locate active life insurance coverage connected to a decedent, with a secure workflow built
                for estate planning and post-loss administration.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link href="/attorney/sign-up" className="btn-primary text-base px-7 py-3">
                  For Attorneys
                </Link>
                <Link
                  href="/client/invite-code"
                  className="inline-flex items-center justify-center rounded-xl px-7 py-3 text-base font-semibold
                             border border-white/15 bg-white/5 text-paper-50 hover:bg-white/10 transition"
                >
                  Client Invitation
                </Link>
              </div>

              <div className="mt-10 flex items-center justify-center md:justify-start gap-6 text-sm text-paper-100/70">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gold-500" />
                  <span>Nationwide coverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gold-500" />
                  <span>Secure registry model</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gold-500" />
                  <span>Professional workflow</span>
                </div>
              </div>
            </div>

            {/* Visual */}
            <div className="relative">
              <div className="rounded-3xl border border-gold-500/25 bg-white/5 shadow-lift backdrop-blur">
                <div className="p-6 md:p-8">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink-950/40">
                    <Image
                      src="/vault-hv.png"
                      alt="HeirVault secure vault"
                      fill
                      className="object-contain p-6 drop-shadow-2xl"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority
                    />
                    <div className="absolute inset-0 ring-1 ring-white/10 rounded-2xl" />
                  </div>

                  <div className="mt-6 grid gap-3">
                    <div className="flex items-center justify-between text-sm text-paper-100/70">
                      <span>Security posture</span>
                      <span className="text-paper-50 font-semibold">Enterprise-grade</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-[82%] bg-gold-500/80" />
                    </div>
                    <p className="text-sm text-paper-100/70">
                      Designed for clarity, auditability, and authorized access—not document chaos.
                    </p>
                  </div>
                </div>
              </div>

              {/* subtle corner accent */}
              <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gold-500/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-paper-50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl text-ink-900">
              How HeirVault Works
            </h2>
            <p className="mt-4 text-base md:text-lg text-slateui-600 max-w-2xl mx-auto">
              A clean, secure process designed to reduce delays and uncertainty when it matters most.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Card 1 */}
            <div className="card p-8 text-center transition hover:-translate-y-1 hover:shadow-lift">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-100 border border-slateui-200">
                <Image src="/search-hv.png" alt="Search icon" width={44} height={44} />
              </div>
              <h3 className="mt-6 font-display text-xl text-ink-900">Search for a Policy</h3>
              <p className="mt-3 text-sm md:text-base text-slateui-600">
                Provide identifying details to help locate potential coverage associated with a decedent.
              </p>
            </div>

            {/* Card 2 */}
            <div className="card p-8 text-center transition hover:-translate-y-1 hover:shadow-lift">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-100 border border-slateui-200">
                <Image src="/vault-hv.png" alt="Secure icon" width={44} height={44} />
              </div>
              <h3 className="mt-6 font-display text-xl text-ink-900">Secure Your Claim</h3>
              <p className="mt-3 text-sm md:text-base text-slateui-600">
                Keep records organized and reduce back-and-forth during beneficiary or executor workflows.
              </p>
            </div>

            {/* Card 3 */}
            <div className="card p-8 text-center transition hover:-translate-y-1 hover:shadow-lift">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-100 border border-slateui-200">
                <Image src="/folder-hv.png" alt="Folder icon" width={44} height={44} />
              </div>
              <h3 className="mt-6 font-display text-xl text-ink-900">Manage Policies</h3>
              <p className="mt-3 text-sm md:text-base text-slateui-600">
                Maintain a structured record for future access and continuity across the lifecycle of an estate plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted */}
      <section className="bg-paper-100 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl text-ink-900">
              Trusted by Families & Estate Planners Nationwide
            </h2>
            <p className="mt-4 text-base md:text-lg text-slateui-600 max-w-3xl mx-auto">
              A registry-first approach that prioritizes authorized access, documentation continuity, and fewer probate-time surprises.
            </p>
          </div>

          <div className="mt-10">
            <StarsRow rating={4.5} reviews={121} />
          </div>

          <div className="mt-10 grid items-center gap-6 md:grid-cols-3">
            <div className="md:col-span-2 card p-8 md:p-10">
              <h3 className="font-display text-2xl text-ink-900">Credibility signals that matter</h3>
              <p className="mt-3 text-slateui-600">
                Estate workflows reward clarity. HeirVault is designed to reduce document loss, streamline authorized access, and support
                orderly administration.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-8">
                <Image
                  src="/logo-hv.png"
                  alt="Partner/credential logo"
                  width={140}
                  height={70}
                  className="opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition"
                />
                {/* Replace this with actual credential/partner logos when you have them */}
                <div className="h-12 w-40 rounded-xl bg-slateui-100 border border-slateui-200 flex items-center justify-center text-sm text-slateui-600">
                  Add partner logo
                </div>
                <div className="h-12 w-40 rounded-xl bg-slateui-100 border border-slateui-200 flex items-center justify-center text-sm text-slateui-600">
                  Add credential
                </div>
              </div>
            </div>

            <div className="card p-8 md:p-10">
              <div className="text-sm font-semibold text-slateui-600">Security posture</div>
              <div className="mt-2 text-2xl font-display text-ink-900">Registry-grade</div>
              <p className="mt-3 text-slateui-600">
                Built for controlled access and record continuity. No clutter. No guesswork.
              </p>

              <div className="mt-8">
                <div className="h-2 w-full rounded-full bg-slateui-200 overflow-hidden">
                  <div className="h-full w-[78%] bg-gold-500/80" />
                </div>
                <div className="mt-2 text-xs text-slateui-600">Operational readiness</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="bg-paper-50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl text-ink-900">Why Choose HeirVault?</h2>
            <p className="mt-4 text-base md:text-lg text-slateui-600 max-w-2xl mx-auto">
              Built for practical outcomes: fewer delays, cleaner records, and a workflow professionals can trust.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="card p-8 transition hover:-translate-y-1 hover:shadow-lift">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-100 border border-slateui-200">
                  <Image src="/service-hv.png" alt="Service" width={30} height={30} />
                </div>
                <h3 className="font-display text-xl text-ink-900">Comprehensive Service</h3>
              </div>
              <p className="mt-4 text-slateui-600">
                A structured approach to organizing and maintaining life insurance-related records across estate workflows.
              </p>
            </div>

            <div className="card p-8 transition hover:-translate-y-1 hover:shadow-lift">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-100 border border-slateui-200">
                  <Image src="/trust-hv.png" alt="Trust" width={30} height={30} />
                </div>
                <h3 className="font-display text-xl text-ink-900">Secure & Trusted</h3>
              </div>
              <p className="mt-4 text-slateui-600">
                Privacy-forward design with controlled access patterns suited to sensitive estate and beneficiary contexts.
              </p>
            </div>

            <div className="card p-8 transition hover:-translate-y-1 hover:shadow-lift">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-100 border border-slateui-200">
                  <Image src="/world-hv.png" alt="Nationwide" width={30} height={30} />
                </div>
                <h3 className="font-display text-xl text-ink-900">Nationwide Coverage</h3>
              </div>
              <p className="mt-4 text-slateui-600">
                Designed to support nationwide discovery workflows and consistent record handling across jurisdictions.
              </p>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/attorney/sign-up" className="btn-primary px-8 py-3 text-base">
              For Attorneys
            </Link>
            <Link href="/client/invite-code" className="btn-secondary px-8 py-3 text-base">
              Client Invitation
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-paper-50 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl text-ink-900">Frequently Asked Questions</h2>
            <p className="mt-4 text-base md:text-lg text-slateui-600">
              Common questions about HeirVault and how it works.
            </p>
          </div>

          <div className="mt-12 space-y-6">
            <div className="card p-6">
              <h3 className="font-display text-xl text-ink-900">What is HeirVault?</h3>
              <p className="mt-3 text-slateui-600">
                HeirVault is a secure, private registry that helps locate unclaimed life insurance policies. 
                It&apos;s designed for estate professionals and families to maintain organized records of life insurance 
                coverage and beneficiary information.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="font-display text-xl text-ink-900">Who can use HeirVault?</h3>
              <p className="mt-3 text-slateui-600">
                HeirVault is primarily designed for attorneys and estate planning professionals. Clients can be 
                invited by their attorney to register their policy information securely.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="font-display text-xl text-ink-900">Is HeirVault affiliated with insurance companies?</h3>
              <p className="mt-3 text-slateui-600">
                No. HeirVault is a private, voluntary registry that is not affiliated with insurers or regulators. 
                Participation is voluntary and not required by law.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="font-display text-xl text-ink-900">How secure is my information?</h3>
              <p className="mt-3 text-slateui-600">
                HeirVault uses enterprise-grade security measures to protect your data. Access is controlled 
                and all searches are logged for audit and compliance purposes. Policy amounts are not stored.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="font-display text-xl text-ink-900">What information do I need to search for a policy?</h3>
              <p className="mt-3 text-slateui-600">
                To search for policies, you&apos;ll need basic identifying information such as the decedent&apos;s name, 
                date of birth, and Social Security number. For global searches and exports, a certified death 
                certificate is required.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="font-display text-xl text-ink-900">How do clients register their policies?</h3>
              <p className="mt-3 text-slateui-600">
                Attorneys can generate an invitation code for their clients. Clients use this code to access 
                the registration portal, where they can upload the first page of their policy. Once uploaded, 
                the information is automatically added to the registry and the client receives a confirmation receipt.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="font-display text-xl text-ink-900">Can I make changes to my registered information?</h3>
              <p className="mt-3 text-slateui-600">
                Yes. If you need to update your policy information, you can fill out the change request form 
                on your receipt or upload a new policy page through the client portal.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="font-display text-xl text-ink-900">Is there a cost to use HeirVault?</h3>
              <p className="mt-3 text-slateui-600">
                Please contact us for pricing information. We offer plans for solo practitioners, small firms, 
                and enterprise organizations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-paper-100 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-display text-3xl md:text-4xl text-ink-900">Have More Questions?</h2>
          <p className="mt-4 text-base md:text-lg text-slateui-600">
            Contact us for more information about HeirVault and how it can help your practice.
          </p>
          <div className="mt-8">
            <Link href="/attorney/sign-up" className="btn-primary px-8 py-3 text-base">
              Get Started Today
            </Link>
          </div>
        </div>
      </section>

      {/* Placeholder anchor for nav */}
      <div id="resources" className="sr-only" />

      <Footer />
    </main>
  );
}
