"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { Shield } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#070B14] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_20%_10%,rgba(200,148,45,0.15),transparent_60%),radial-gradient(900px_600px_at_80%_20%,rgba(26,42,69,0.18),transparent_55%),radial-gradient(900px_700px_at_50%_90%,rgba(11,18,32,0.25),transparent_60%)]" />
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      {/* Top Nav */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070B14]/75 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo size="xl" variant="icon-only" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide" style={{ color: "#E1B75A", fontFamily: "'Playfair Display', Georgia, serif" }}>HeirVault</div>
              <div className="text-xs text-white/60">Life Insurance Policy Registry</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
            <a href="#how" className="hover:text-[#E1B75A] transition">How it works</a>
            <a href="#pricing" className="hover:text-[#E1B75A] transition">Pricing</a>
            <a href="#security" className="hover:text-[#E1B75A] transition">Security</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/sign-in"
              className="hidden rounded-xl border border-red-500/30 bg-red-600/10 px-3 py-2 text-xs font-semibold text-red-400 hover:border-red-500/50 hover:bg-red-600/20 transition md:inline-flex items-center gap-1.5"
              title="Administrator Sign In"
            >
              <Shield className="h-3.5 w-3.5" />
              Admin
            </Link>
            <Link
              href="/attorney/sign-in"
              className="hidden rounded-xl border border-white/15 px-4 py-2 text-sm text-white/85 hover:border-[#E1B75A]/50 hover:text-[#E1B75A] transition md:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/start"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#C8942D] via-[#D4A84A] to-[#E1B75A] px-4 py-2 text-sm font-semibold text-[#0B1220] shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_20px_50px_rgba(200,148,45,0.22)] hover:brightness-110 transition"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/75 mb-6">
            <span className="h-2 w-2 rounded-full bg-[#EAB308]" />
            Designed for probate attorneys, estate administrators, and firm staff
          </div>

          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            A life insurance policy registry built for estates and probate.
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-white/75 max-w-2xl mx-auto">
            Track, verify, and document life insurance policies per estate—without chasing PDFs, emails, or unanswered calls.
          </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/start"
                className="inline-flex items-center justify-center rounded-xl bg-[#EAB308] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_20px_55px_rgba(234,179,8,0.16)] hover:brightness-105 transition"
              >
                Create your first policy registry
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 hover:border-[#E1B75A]/50 hover:bg-white/8 transition"
              >
                See how it works
              </Link>
            </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12">
          <h2 className="text-2xl font-semibold tracking-tight mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Why HeirVault exists
          </h2>
          <p className="text-lg text-white/80 mb-6">
            Life insurance policies are often:
          </p>
          <ul className="space-y-3 text-white/75 mb-8">
            <li className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
              <span>partially known,</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
              <span>undocumented,</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
              <span>scattered across inboxes and folders,</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
              <span>or discovered too late.</span>
            </li>
          </ul>
          <p className="text-white/70 mb-4">
            Firms waste time chasing carriers. Families don't know what exists. Policy proof gets buried in document clutter.
          </p>
          <div className="rounded-2xl border border-[#EAB308]/30 bg-[#EAB308]/10 p-6">
            <p className="text-white/90 font-semibold">
              <strong className="text-[#EAB308]">HeirVault solves one specific problem:</strong>
              <br />
              Knowing <strong>what policies exist</strong>, <strong>what's verified</strong>, and <strong>what's missing</strong>—per estate.
            </p>
          </div>
        </div>
      </section>

      {/* Core Positioning - Registry First */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold tracking-tight mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            A structured policy registry — per estate
          </h2>
          <p className="text-lg text-white/75 max-w-3xl mx-auto">
            HeirVault is not a generic document vault. It is a <strong className="text-[#EAB308]">policy-first registry</strong> that treats life insurance like a tracked asset.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Each estate gets a clear, auditable registry:
            </h3>
            <ul className="space-y-3 text-white/75">
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1A2A45]" />
                <span>Carrier</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1A2A45]" />
                <span>Policy number</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1A2A45]" />
                <span>Insured party</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1A2A45]" />
                <span>Beneficiaries</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1A2A45]" />
                <span>Status (unknown, requested, verified, resolved)</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1A2A45]" />
                <span>Supporting documents</span>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-[#EAB308]/20 bg-[#EAB308]/5 p-8">
            <div className="text-2xl font-semibold mb-4 text-[#EAB308]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              No guessing. No hunting. No ambiguity.
            </div>
            <p className="text-white/80">
              The registry remains the center of gravity. Everything else—documents, uploads, exports—serves the registry.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-14">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold tracking-tight mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            How it works
          </h2>
          <p className="text-lg text-white/75">
            This workflow repeats cleanly for every estate.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Step 
            n="01" 
            title="Create an estate registry" 
            desc="Open a registry for an estate and log known or suspected policies." 
          />
          <Step 
            n="02" 
            title="Track verification status" 
            desc="Mark policies as requested, verified, paid, or denied as documentation arrives." 
          />
          <Step 
            n="03" 
            title="Collect proof" 
            desc="Attach policy documents and correspondence directly to the policy record." 
          />
          <Step 
            n="04" 
            title="Export a clean summary" 
            desc="Generate a Policy Registry Summary PDF for filings, clients, or internal review." 
          />
        </div>
      </section>

      {/* Supporting Features */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-8 md:grid-cols-3">
          <Feature
            title="Secure document vault"
            desc="Policy documents need a home. Files are tied to specific policies, accessed via time-limited links, and logged for accountability. The registry remains the center of gravity."
            accent="blue"
          />
          <Feature
            title="Client upload links"
            desc="When families have documents, send them a secure upload request. No accounts to manage. No shared inboxes. Files land on the correct policy record automatically."
            accent="gold"
          />
          <Feature
            title="Policy Registry Summary"
            desc="Generate a clean, structured summary showing all known policies, current verification status, and attached documentation. This is the document firms wish they already had."
            accent="gold"
          />
        </div>
      </section>

      {/* Sample PDF Preview */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold tracking-tight mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              See what you get
            </h2>
            <p className="text-white/75 max-w-2xl mx-auto">
              This is the Policy Registry Summary PDF your firm generates for each estate. Clean, structured, and ready to circulate or file.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#EAB308]/20 via-[#1A2A45]/20 to-[#111C33]/20 blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-lg font-semibold text-white/90 mb-1">Sample Policy Registry Summary</div>
                  <div className="text-sm text-white/60">Redacted sample showing structure and format</div>
                </div>
                <span className="rounded-full border border-[#EAB308]/35 bg-[#EAB308]/15 px-3 py-1 text-xs text-[#FDE68A]">
                  SAMPLE
                </span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#070B14]/80 p-6 mb-6">
                <div className="space-y-3 text-sm text-white/75">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Estate / Matter:</span>
                    <span className="font-medium">Sample Estate of J. Doe</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Prepared for:</span>
                    <span className="font-medium">Sample Firm, PLLC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Policies listed:</span>
                    <span className="font-medium">3 (1 verified, 2 pending)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Format:</span>
                    <span className="font-medium">2-page PDF with registry table & notes</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="/api/policy-registry-summary/sample"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-[#EAB308] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_20px_55px_rgba(234,179,8,0.18)] hover:brightness-105 transition w-full sm:w-auto"
                >
                  View Sample PDF
                </a>
                <a
                  href="/api/policy-registry-summary/sample"
                  download
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 hover:border-[#E1B75A]/50 hover:bg-white/8 transition w-full sm:w-auto"
                >
                  Download Sample
                </a>
              </div>

              <p className="mt-6 text-xs text-white/55 text-center">
                This is the document firms wish they already had. Generated from your registry in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-14">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold tracking-tight mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Simple pricing based on estates, not seats
          </h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl border border-[#EAB308]/35 bg-white/5 p-8 md:p-12 shadow-[0_0_0_1px_rgba(234,179,8,0.16),0_40px_120px_rgba(234,179,8,0.10)]">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-5xl font-semibold tracking-tight">$39</span>
              <span className="text-xl text-white/70">/ month per firm</span>
            </div>
            <div className="text-lg font-semibold mb-8 text-[#EAB308]">Registry Base</div>

            <div className="mb-8">
              <p className="text-white/80 mb-6">Includes:</p>
              <ul className="space-y-3 text-white/75">
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
                  <span>Up to <strong>5 active policy registries</strong> (estates)</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
                  <span>Unlimited policies per registry</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
                  <span>Unlimited policy-attached documents</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
                  <span>Policy status tracking</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
                  <span>Policy Registry Summary export (PDF)</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
                  <span>Client upload link per registry</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
                  <span>1 admin + 2 staff users</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
                  <span>Secure, time-limited file access</span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
                  <span>Audit logging for uploads and exports</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-white/10 pt-8 space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-white/80">Additional active registries</span>
                <span className="text-xl font-semibold">$8 per registry / month</span>
              </div>
              <p className="text-sm text-white/60">Closed estates can be archived and kept read-only.</p>

              <div className="flex items-baseline justify-between pt-4 border-t border-white/10">
                <span className="text-white/80">Additional users</span>
                <span className="text-xl font-semibold">$10 per user / month</span>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-sm text-white/60 mb-6">
                <strong className="text-white/80">No storage limits. No long-term contracts. No surprise fees.</strong>
              </p>
              <Link
                href="/start"
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#EAB308] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_20px_55px_rgba(234,179,8,0.18)] hover:brightness-105 transition"
              >
                Create your first registry
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-6xl px-5 py-14">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12">
          <h2 className="text-2xl font-semibold tracking-tight mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Security & Trust
          </h2>
          <p className="text-lg text-white/80 mb-6">
            HeirVault is designed for professional responsibility:
          </p>
          <ul className="space-y-3 text-white/75 mb-6">
            <li className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1A2A45]" />
              <span>Firm-level tenant isolation</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1A2A45]" />
              <span>Role-based access controls</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1A2A45]" />
              <span>Time-limited file access</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1A2A45]" />
              <span>Action logging for key events</span>
            </li>
          </ul>
          <p className="text-white/70 italic">
            Security isn't a marketing claim—it's built into the architecture.
          </p>
        </div>
      </section>

      {/* Who It's For */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Who it's for
          </h2>
          <p className="text-lg text-white/80 mb-6">
            HeirVault is built for:
          </p>
          <ul className="space-y-3 text-white/75 max-w-2xl mx-auto">
            <li className="flex gap-3 justify-center">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
              <span>Probate and estate attorneys</span>
            </li>
            <li className="flex gap-3 justify-center">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
              <span>Estate administration professionals</span>
            </li>
            <li className="flex gap-3 justify-center">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EAB308]" />
              <span>Firm staff responsible for policy discovery and documentation</span>
            </li>
          </ul>
          <p className="mt-6 text-white/70">
            If policy tracking is a recurring problem, HeirVault fits.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-10 md:p-12">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#EAB308]/15 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-[#1A2A45]/18 blur-3xl" />

          <div className="relative text-center">
            <h3 className="text-3xl font-semibold tracking-tight mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Stop losing time chasing life insurance policies.
            </h3>
            <p className="text-lg text-white/75 mb-8 max-w-2xl mx-auto">
              Build a registry that shows exactly what exists—and what doesn't.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/start"
                className="inline-flex items-center justify-center rounded-xl bg-[#EAB308] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_20px_55px_rgba(234,179,8,0.18)] hover:brightness-105 transition"
              >
                Create your first policy registry
              </Link>
            </div>

            <p className="mt-6 text-sm text-white/60">
              No credit card required for initial access.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}

/* ----------------------------- UI Components ----------------------------- */

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="text-xs font-semibold text-[#FDE68A] mb-3">{n}</div>
      <div className="text-lg font-semibold text-white/90 mb-2">{title}</div>
      <div className="text-sm text-white/65 leading-relaxed">{desc}</div>
    </div>
  );
}

function Feature({
  title,
  desc,
  accent,
}: {
  title: string;
  desc: string;
  accent: "gold" | "blue";
}) {
  const ring =
    accent === "gold"
      ? "shadow-[0_0_0_1px_rgba(234,179,8,0.22),0_30px_90px_rgba(234,179,8,0.10)]"
      : "shadow-[0_0_0_1px_rgba(26,42,69,0.22),0_30px_90px_rgba(26,42,69,0.10)]";

  const dot = accent === "gold" ? "bg-[#EAB308]" : "bg-[#1A2A45]";

  return (
    <div className={`rounded-3xl border border-white/10 bg-white/5 p-6 ${ring}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <div className="text-lg font-semibold tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{title}</div>
      </div>
      <p className="text-sm leading-relaxed text-white/70">{desc}</p>
    </div>
  );
}
