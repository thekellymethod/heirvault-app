"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import {
  DarkGridPattern,
  HeroRegistryIllustration,
  ShieldRingOnDark,
  WorkflowStripOnDark,
} from "@/components/landing/LandingGraphics";

/** Static surfaces (proof, pricing, registry cards) */
const cardStatic = "rounded-xl border border-white/[0.06] bg-hv-surface";
const cardInteractive = "rounded-xl border border-white/[0.06] bg-hv-surface transition-colors duration-200 hover:border-white/[0.09]";

function PrimaryCta({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`btn-primary text-sm font-semibold ${className}`}>
      {children}
    </Link>
  );
}

function SecondaryCta({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl border border-white/[0.06] bg-transparent px-6 py-3 text-sm font-medium text-hv-text-secondary transition-colors duration-200 hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-hv-text ${className}`}
    >
      {children}
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-hv-bg text-hv-text antialiased">
      <div className="pointer-events-none fixed inset-0 -z-10 hv-hero-bg" />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.14] [background-image:linear-gradient(to_right,rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.028)_1px,transparent_1px)] [background-size:64px_64px]"
        aria-hidden
      />

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-hv-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Logo 
            size="sm" 
            colorMode="light" 
            variant="default"
            showTagline={true}
            className="flex-row" 
          />
        </Link>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-hv-text-secondary md:flex">
            <a href="#how" className="transition hover:text-hv-text">
              How it works
            </a>
            <a href="#proof" className="transition hover:text-hv-text">
              Sample output
            </a>
            <a href="#pricing" className="transition hover:text-hv-text">
              Pricing
            </a>
            <a href="#security" className="transition hover:text-hv-text">
              Security
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/attorney/sign-in"
              className="hidden rounded-xl border border-white/[0.06] px-4 py-2 text-sm text-hv-text-secondary transition-colors hover:border-white/[0.1] hover:bg-white/[0.04] md:inline-flex"
            >
              Log in
            </Link>
            <PrimaryCta href="/start" className="!px-4 !py-2">
              Start free
            </PrimaryCta>
          </div>
        </div>
      </header>

      <div className="border-b border-white/[0.06] bg-hv-bg-soft/20">
        <p className="mx-auto max-w-3xl px-6 py-1.5 text-[11px] leading-snug text-hv-text-muted md:text-center">
          <span className="text-hv-text-secondary">Attorneys, administrators, firm staff.</span>{" "}
          <span className="text-hv-text-muted">Policyholders:</span>{" "}
          <Link href="/submit-policy" className="font-medium text-hv-accent underline-offset-2 hover:underline">
            Submit documents
          </Link>
          <span className="text-hv-text-muted"> · receipt · no sign-in · firm access requires account</span>
        </p>
      </div>

      {/* Hero — extra vertical air vs body sections */}
      <section className="relative overflow-hidden px-6 pb-28 pt-24 md:pb-36 md:pt-32">
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(260px,380px)] lg:gap-16">
          <div className="text-left">
            <h1 className="hv-hero-title max-w-[20ch]">
              A life insurance policy registry built for estates and probate.
            </h1>
            <p className="mt-7 max-w-lg hv-body">
              Track, verify, and document policies per estate—without carrier chase.
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-3">
              <PrimaryCta href="/start">Create your first policy registry</PrimaryCta>
              <SecondaryCta href="#how">See how it works</SecondaryCta>
            </div>
            <p className="mt-5 max-w-sm text-[12px] leading-snug text-hv-text-muted">
              Structured records · audit-ready
            </p>
          </div>

          <div className="mx-auto w-full max-w-[340px] shrink-0 lg:mx-0">
            <div className={`${cardStatic} bg-hv-surface/85 p-5 md:p-6`}>
              <HeroRegistryIllustration className="mx-auto h-auto w-full max-w-[280px] opacity-[0.88]" />
              <p className="mt-4 text-center text-[11px] leading-snug text-hv-text-muted">
                Registry view — structured and auditable
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="relative h-8 w-full overflow-hidden border-t border-white/[0.06] bg-hv-bg">
        <WorkflowStripOnDark className="absolute bottom-0 left-1/2 h-7 w-[min(880px,92%)] -translate-x-1/2 opacity-[0.32]" />
      </div>

      <section className="relative border-t border-white/[0.06] bg-hv-bg-soft hv-section-y">
        <DarkGridPattern className="pointer-events-none absolute -right-16 top-0 h-[min(100%,480px)] w-[min(52%,380px)] opacity-[0.12]" />
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <h2 className="hv-h2 max-w-[40rem]">Why HeirVault exists</h2>
          <p className="mt-6 max-w-[36rem] hv-body text-hv-text-secondary">Life insurance policies are often:</p>
          <ul className="mt-4 max-w-[38rem] space-y-2 text-left text-[15px] leading-relaxed text-hv-text-secondary">
            <ListItem>partially known,</ListItem>
            <ListItem>undocumented,</ListItem>
            <ListItem>scattered across inboxes and folders,</ListItem>
            <ListItem>or discovered too late.</ListItem>
          </ul>
          <p className="mt-7 max-w-[40rem] hv-body">
            Firms lose time to carrier chase. Families lack a single view. Proof is buried in clutter.
          </p>
          <aside className="mt-8 max-w-[36rem] border-l border-hv-accent/40 pl-4">
            <p className="text-left text-[15px] leading-relaxed text-hv-text">
              <span className="font-medium text-hv-accent">HeirVault answers one question:</span> what exists, what is
              verified, and what is missing—<strong className="font-semibold text-hv-text">per estate</strong>.
            </p>
          </aside>
        </div>
      </section>

      <section className="relative border-t border-white/[0.06] bg-hv-bg hv-section-y">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="hv-h2 max-w-[36rem] text-left">A structured policy registry — per estate</h2>
          <p className="mt-6 max-w-[36rem] text-left hv-body">
            HeirVault is not a document vault. It is a{" "}
            <strong className="font-semibold text-hv-accent">policy-first registry</strong> that treats life insurance as a
            tracked matter record.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2 md:items-stretch md:gap-6">
            <SurfaceCard className="flex min-h-0 flex-col p-6 md:p-7">
              <h3 className="hv-h3 mb-4">Each estate gets an auditable registry</h3>
              <ul className="space-y-2 text-left text-sm leading-relaxed text-hv-text-secondary">
                <ListItemMuted>Carrier</ListItemMuted>
                <ListItemMuted>Policy number</ListItemMuted>
                <ListItemMuted>Insured party</ListItemMuted>
                <ListItemMuted>Beneficiaries</ListItemMuted>
                <ListItemMuted>Status (unknown, requested, verified, resolved)</ListItemMuted>
                <ListItemMuted>Documents</ListItemMuted>
              </ul>
            </SurfaceCard>
            <SurfaceCard className="flex min-h-0 flex-col p-6 md:p-7">
              <h3 className="hv-h3 mb-4 text-hv-text">One system of record</h3>
              <p className="text-left text-sm leading-relaxed text-hv-text-secondary">
                The registry stays the center of gravity. Documents, uploads, and exports support the policy record—not the
                reverse.
              </p>
            </SurfaceCard>
          </div>
        </div>
      </section>

      <section id="how" className="relative border-t border-white/[0.06] bg-hv-bg-soft hv-section-y">
        <DarkGridPattern className="pointer-events-none absolute -left-8 bottom-0 h-64 w-1/2 max-w-sm opacity-[0.1]" />
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-hv-text-muted">Workflow</p>
          <h2 className="hv-h2 mt-3 text-left">How it works</h2>
          <p className="mt-4 max-w-xl text-left hv-body">The same sequence applies to every estate.</p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Step n="01" title="Create an estate registry" desc="Open a registry and log known or suspected policies." />
            <Step n="02" title="Track verification status" desc="Update status as responses and documents arrive." />
            <Step n="03" title="Collect proof" desc="Attach documents to the policy record." />
            <Step n="04" title="Export a summary" desc="Generate a Policy Registry Summary PDF." />
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/[0.06] bg-hv-bg-muted hv-section-y">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 md:grid-cols-3 md:gap-6">
          <Feature
            title="Secure document vault"
            desc="Files attach to policies with time-limited access and logging. The registry remains authoritative."
          />
          <Feature
            title="Client upload links"
            desc="Request documents without accounts. Uploads land on the correct policy record."
          />
          <Feature
            title="Policy Registry Summary"
            desc="Structured PDF of policies, status, and attachments."
          />
        </div>
      </section>

      <section id="proof" className="relative border-t border-white/[0.06] bg-hv-bg-soft hv-section-y">
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-hv-text-muted">Deliverable</p>
          <h2 className="hv-h2 mt-3 max-w-2xl text-left">See what you get</h2>
          <p className="mt-4 max-w-xl text-left hv-body">
            Policy Registry Summary PDF per estate—for filings, review, or client communication.
          </p>

          <div className={`mt-10 ${cardStatic} bg-hv-surface/90 p-8 md:p-10`}>
            <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div>
                <div className="font-display text-xl font-medium tracking-tight text-hv-text">Sample Policy Registry Summary</div>
                <div className="mt-1.5 hv-small">Redacted example — structure and format only</div>
              </div>
              <span className="inline-flex w-fit shrink-0 rounded border border-white/[0.06] bg-hv-bg/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-hv-text-muted">
                Sample
              </span>
            </div>

            <div className="mt-6 rounded-lg bg-hv-bg/50 p-5 text-sm text-hv-text-secondary md:p-6">
              <Row label="Estate / matter:" value="Sample Estate of J. Doe" />
              <Row label="Prepared for:" value="Sample Firm, PLLC" />
              <Row label="Policies listed:" value="3 (1 verified, 2 pending)" />
              <Row label="Format:" value="2-page PDF with registry table and notes" />
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-3">
              <a
                href="/api/policy-registry-summary/sample"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex flex-1 items-center justify-center text-sm sm:flex-none sm:min-w-[168px]"
              >
                View sample PDF
              </a>
              <a
                href="/api/policy-registry-summary/sample"
                download
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/[0.06] px-6 py-3 text-sm font-medium text-hv-text transition-colors hover:border-white/[0.1] hover:bg-white/[0.04] sm:flex-none"
              >
                Download
              </a>
            </div>
            <p className="mt-5 text-left text-[11px] text-hv-text-muted">Generated from your registry.</p>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative border-t border-white/[0.06] bg-hv-bg hv-section-y">
        <DarkGridPattern className="pointer-events-none absolute right-0 top-20 h-80 w-1/2 max-w-md opacity-[0.08]" />
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <h2 className="hv-h2 text-left">Pricing</h2>
          <p className="mt-4 max-w-xl text-left hv-body">Active estates drive cost—not seat count.</p>

          <div className={`mx-auto mt-10 max-w-3xl ${cardStatic} p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] md:p-10`}>
            <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hv-text-muted">Registry base plan</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-5xl font-semibold tracking-tight text-hv-text md:text-6xl">$39</span>
                  <span className="text-lg text-hv-text-secondary">/ month · per firm</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-hv-text-muted"> Typical firm: 3–10 active estates tracked simultaneously
              </p>
              <p className="max-w-xs text-sm leading-snug text-hv-text-secondary md:text-right">
                Core workflow for small firms. Scale with add-ons.
              </p>
            </div>

            <div className="py-8">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-hv-text-muted">Included</p>
              <ul className="grid gap-x-10 gap-y-2.5 text-left text-sm leading-snug text-hv-text-secondary md:grid-cols-2">
                <PricingItem>
                  Up to <strong className="font-medium text-hv-text">5 active registries</strong> (estates)
                </PricingItem>
                <PricingItem>Unlimited policies per registry</PricingItem>
                <PricingItem>Unlimited policy-attached documents</PricingItem>
                <PricingItem>Status tracking</PricingItem>
                <PricingItem>Registry Summary PDF export</PricingItem>
                <PricingItem>Client upload link per registry</PricingItem>
                <PricingItem>1 admin + 2 staff users</PricingItem>
                <PricingItem>Time-limited file access</PricingItem>
                <PricingItem className="md:col-span-2">Audit logging for uploads and exports</PricingItem>
              </ul>
            </div>

            <div className="border-t border-white/[0.06] pt-8">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-hv-text-muted">Add-ons</p>
              <div className="flex flex-col gap-0.5 border-b border-white/[0.06] py-3 sm:flex-row sm:items-baseline sm:justify-between">
                <span className="text-hv-text-secondary">Additional active registries</span>
                <span className="font-display text-lg font-semibold tabular-nums text-hv-text">$8 / registry / mo</span>
              </div>
              <p className="hv-small py-2">Closed estates may be archived read-only.</p>
              <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between">
                <span className="text-hv-text-secondary">Additional users</span>
                <span className="font-display text-lg font-semibold tabular-nums text-hv-text">$10 / user / mo</span>
              </div>
            </div>

            <div className="mt-8 border-t border-white/[0.06] pt-8">
              <p className="mb-5 max-w-md text-sm leading-snug text-hv-text-secondary">
                Predictable fees. No long-term commitments.
              </p>
              <PrimaryCta href="/start" className="w-full justify-center sm:w-auto">
                Create your first registry
              </PrimaryCta>
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="border-t border-white/[0.06] bg-hv-bg-soft hv-section-y">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex max-w-4xl flex-col gap-8 md:flex-row md:items-start md:gap-12">
            <div className="min-w-0 flex-1">
              <h2 className="hv-h2">Security and trust</h2>
              <p className="mt-5 max-w-[40rem] hv-body">Built for professional responsibility.</p>
              <ul className="mt-5 max-w-[38rem] space-y-2 text-left text-sm leading-relaxed text-hv-text-secondary">
                <ListItemMuted>Firm-level tenant isolation</ListItemMuted>
                <ListItemMuted>Role-based access</ListItemMuted>
                <ListItemMuted>Time-limited file access</ListItemMuted>
                <ListItemMuted>Action logging for key events</ListItemMuted>
              </ul>
              <p className="mt-7 text-sm italic leading-relaxed text-hv-text-muted">
                Security is structural: access boundaries and traceability first.
              </p>
            </div>
            <div className="mx-auto shrink-0 opacity-[0.65] md:mx-0 md:pt-0.5">
              <ShieldRingOnDark className="h-20 w-20 md:h-24 md:w-24" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/[0.06] bg-hv-bg hv-section-y">
        <DarkGridPattern className="pointer-events-none absolute inset-0 opacity-[0.06]" />
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <h2 className="hv-h2 text-left">Who it&apos;s for</h2>
          <p className="mt-3 max-w-xl text-left text-[15px] leading-relaxed text-hv-text-secondary">Built for:</p>
          <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
            <div className="text-left">
              <p className="font-display text-[15px] font-medium text-hv-text">Probate and estate attorneys</p>
              <p className="mt-2 text-sm leading-relaxed text-hv-text-secondary">
                Matter-centric records with a defensible trail.
              </p>
            </div>
            <div className="text-left">
              <p className="font-display text-[15px] font-medium text-hv-text">Estate administration</p>
              <p className="mt-2 text-sm leading-relaxed text-hv-text-secondary">
                One registry per estate—not scattered records.
              </p>
            </div>
            <div className="text-left">
              <p className="font-display text-[15px] font-medium text-hv-text">Firm staff</p>
              <p className="mt-2 text-sm leading-relaxed text-hv-text-secondary">
                Verified, pending, and unknown—without inbox search.
              </p>
            </div>
          </div>
          <p className="mt-10 max-w-xl text-left text-sm text-hv-text-muted">
            When policy visibility is a recurring problem, HeirVault fits.
          </p>
        </div>
      </section>

      <section className="border-t border-white/[0.06] bg-hv-bg px-6 py-24 md:py-32">
        <div
          className={`hv-cta-ambience relative mx-auto max-w-3xl overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-hv-surface to-hv-bg px-8 py-14 text-center md:px-12 md:py-16`}
        >
          <WorkflowStripOnDark className="pointer-events-none absolute left-1/2 top-4 h-8 w-[min(720px,88%)] -translate-x-1/2 opacity-[0.24]" />
          <div className="relative mx-auto max-w-lg pt-6">
            <h3 className="font-display text-2xl font-semibold tracking-tight text-hv-text md:text-[1.75rem] md:leading-snug">
              Stop losing time to unstructured policy information.
            </h3>
            <p className="mt-5 text-base leading-relaxed text-hv-text-secondary">
              A registry that shows what exists—and what remains.
            </p>
            <div className="mt-8 flex justify-center">
              <PrimaryCta href="/start">Create your first policy registry</PrimaryCta>
            </div>
            <p className="mt-5 text-sm text-hv-text-muted">No credit card required for initial access.</p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function SurfaceCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${cardStatic} ${className}`}>{children}</div>;
}

function ListItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 pl-0.5">
      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-hv-text-muted" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function ListItemMuted({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/22" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function PricingItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <li className={`flex gap-2.5 ${className}`}>
      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-hv-text-muted" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col justify-between gap-0.5 border-b border-white/[0.06] py-2.5 last:border-0 sm:flex-row sm:items-baseline sm:gap-6">
      <span className="shrink-0 text-[13px] text-hv-text-muted">{label}</span>
      <span className="font-medium text-hv-text sm:text-right">{value}</span>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className={`${cardInteractive} p-3 md:p-3.5`}>
      <div className="mb-2 text-[10px] font-medium tabular-nums tracking-[0.14em] text-hv-text-muted">{n}</div>
      <div className="font-display text-[15px] font-medium leading-snug text-hv-text">{title}</div>
      <div className="mt-1 text-[13px] leading-snug text-hv-text-secondary">{desc}</div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className={`${cardInteractive} p-5`}>
      <h3 className="font-display text-[15px] font-medium leading-snug text-hv-text">{title}</h3>
      <p className="mt-2.5 text-left text-[13px] leading-relaxed text-hv-text-secondary">{desc}</p>
    </div>
  );
}
