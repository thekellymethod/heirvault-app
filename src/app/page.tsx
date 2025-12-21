"use client";

import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper-50 text-slateui-800 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slateui-200 bg-paper-50/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-6">
            <Logo size="lg" showTagline={false} className="flex-row" />

            <nav className="hidden md:flex items-center gap-7">
              <Link
                href="#home"
                className="text-sm font-medium text-slateui-800 hover:text-ink-900 transition"
              >
                Home
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-medium text-slateui-800 hover:text-ink-900 transition"
              >
                How It Works
              </Link>
              <Link
                href="#resources"
                className="text-sm font-medium text-slateui-800 hover:text-ink-900 transition"
              >
                Resources
              </Link>
              <Link
                href="#faq"
                className="text-sm font-medium text-slateui-800 hover:text-ink-900 transition"
              >
                FAQ
              </Link>
              <Link
                href="#contact"
                className="text-sm font-medium text-slateui-800 hover:text-ink-900 transition"
              >
                Contact
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/sign-in"
                className="hidden sm:inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-slateui-200 bg-white/70 text-ink-900 hover:bg-white transition"
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
        <div className="absolute inset-0">
          <Image
            src="/world-hv.png"
            alt="World map background"
            fill
            priority
            className="object-cover opacity-60"
            sizes="100vw"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/50 via-ink-900/60 to-ink-950/65" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12 md:py-16">
          <div className="grid items-center gap-8 md:gap-12 md:grid-cols-2">
            <div className="text-center md:text-left order-2 md:order-1">
              <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-paper-100/90">
                Secure policy discovery for families & estate professionals
              </p>

              <h1
                className="mt-6 font-serif text-4xl md:text-6xl leading-[1.05] tracking-tight text-white"
              >
                Find Unclaimed Life Insurance Policies Easily
              </h1>

              <p className="mt-6 text-base md:text-lg leading-relaxed text-paper-100/80 max-w-xl mx-auto md:mx-0">
                HeirVault helps locate active life insurance coverage connected to
                a decedent, with a secure workflow built for estate planning and
                post-loss administration.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link href="/sign-in" className="btn-primary text-base px-7 py-3">
                  For Attorneys
                </Link>
                <Link
                  href="/client/invite-code"
                  className="inline-flex items-center justify-center rounded-xl px-7 py-3 text-base font-semibold border border-white/15 bg-white/5 text-paper-50 hover:bg-white/10 transition"
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

            <div className="relative order-1 md:order-2">
              <div className="mb-6 rounded-3xl border border-gold-500/30 bg-white/10 shadow-lift backdrop-blur overflow-hidden relative z-10">
                <div className="relative aspect-[4/3] w-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-gold-500/20 via-blue-500/10 to-ink-950/40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
                      <p className="text-paper-100/80 text-sm font-medium">
                        Protecting Your Legacy
                      </p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/30 to-transparent" />
                </div>
              </div>

              <div className="rounded-3xl border border-gold-500/25 bg-white/5 shadow-lift backdrop-blur relative z-0">
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
                      <span className="text-paper-50 font-semibold">
                        Enterprise-grade
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-[82%] bg-gold-500/80" />
                    </div>
                    <p className="text-sm text-paper-100/70">
                      Designed for clarity, auditability, and authorized access—not
                      document chaos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-gold-500/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-paper-50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl text-ink-900">
              How HeirVault Works
            </h2>
            <p className="mt-4 text-base md:text-lg text-slateui-600 max-w-2xl mx-auto">
              A clean, secure process designed to reduce delays and uncertainty when it matters most.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="card p-8 text-center transition hover:-translate-y-1 hover:shadow-lift">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-100 border border-slateui-200">
                {/* eslint-disable-next-line react/forbid-dom-props */}
                <Image src="/search-hv.png" alt="Search icon" width={44} height={44} style={{ width: 'auto', height: 'auto' }} className="object-contain" />
              </div>
              <h3 className="mt-6 font-display text-xl text-ink-900">Search for a Policy</h3>
              <p className="mt-3 text-sm md:text-base text-slateui-600">
                Provide identifying details to help locate potential coverage associated with a decedent.
              </p>
            </div>

            <div className="card p-8 text-center transition hover:-translate-y-1 hover:shadow-lift">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-100 border border-slateui-200">
                <Image src="/vault-hv.png" alt="Secure icon" width={44} height={44} className="object-contain" />
              </div>
              <h3 className="mt-6 font-display text-xl text-ink-900">Secure Your Claim</h3>
              <p className="mt-3 text-sm md:text-base text-slateui-600">
                Keep records organized and reduce back-and-forth during beneficiary or executor workflows.
              </p>
            </div>

            <div className="card p-8 text-center transition hover:-translate-y-1 hover:shadow-lift">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-100 border border-slateui-200">
                <Image src="/folder-hv.png" alt="Folder icon" width={44} height={44} className="object-contain" />
              </div>
              <h3 className="mt-6 font-display text-xl text-ink-900">Manage Policies</h3>
              <p className="mt-3 text-sm md:text-base text-slateui-600">
                Maintain a structured record for future access and continuity across the lifecycle of an estate plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-paper-50 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl text-ink-900">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-base md:text-lg text-slateui-600">
              Common questions about HeirVault and how it works.
            </p>
          </div>

          <div className="mt-12 space-y-6">
            <div className="card p-6">
              <h3 className="font-display text-xl text-ink-900">What is HeirVault?</h3>
              <p className="mt-3 text-slateui-600">
                HeirVault is a secure, private registry that helps locate unclaimed life insurance policies. It&apos;s
                designed for estate professionals and families to maintain organized records of life insurance coverage
                and beneficiary information.
              </p>
            </div>

            <div className="card p-6">
              <h3 className="font-display text-xl text-ink-900">Who can use HeirVault?</h3>
              <p className="mt-3 text-slateui-600">
                HeirVault is designed for attorneys and estate planning professionals. Clients can be invited
                by their attorney to register their policy information securely.
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
                HeirVault uses enterprise-grade security measures to protect your data. Access is controlled and all
                searches are logged for audit and compliance purposes. Policy amounts are not stored.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-paper-100 py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl md:text-4xl text-ink-900">Have More Questions?</h2>
          <p className="mt-4 text-base md:text-lg text-slateui-600">
            Contact us for more information about HeirVault and how it can help your practice.
          </p>
          <div className="mt-8">
            <Link href="/sign-in" className="btn-primary px-8 py-3 text-base">
              Get Started Today
            </Link>
          </div>
        </div>
      </section>

      <div id="resources" className="sr-only" />

      <Footer />
    </main>
  );
}
