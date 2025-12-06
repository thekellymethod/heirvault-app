import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top gradient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950" />

      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/40">
              <span className="text-lg font-semibold text-emerald-400">HR</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">
                HeirVault
              </span>
              <span className="text-xs text-slate-400">
                Life Insurance & Beneficiary Registry
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <Link href="#how-it-works" className="hover:text-emerald-400">
              How it works
            </Link>
            <Link href="#attorneys" className="hover:text-emerald-400">
              For attorneys
            </Link>
            <Link href="#security" className="hover:text-emerald-400">
              Security
            </Link>
            <Link href="#pricing" className="hover:text-emerald-400">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden text-sm text-slate-300 hover:text-emerald-400 md:inline-block"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
            >
              Start for attorneys
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 lg:px-6 lg:pt-16">
        {/* Hero */}
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/5 px-3 py-1 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Built for probate, estate, and family law attorneys
            </div>

            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Never lose track of a client&apos;s
              <span className="block text-emerald-400">
                life insurance or beneficiaries again.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              HeirVault is a secure registry where your clients record
              which life insurance companies they use and who their
              beneficiaries are—without exposing policy amounts—so you can
              move faster in probate, estate planning, and wrongful death
              matters.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-up"
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:bg-emerald-400"
              >
                Get started as an attorney
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-slate-300 hover:text-emerald-400"
              >
                See how it works
              </Link>
            </div>

            <div className="mt-6 grid max-w-xl gap-3 text-xs text-slate-400 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-emerald-300">No policy amounts</div>
                <p className="mt-1">
                  Store insurer + beneficiary relationships only. Amounts stay
                  private.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-emerald-300">Attorney-centric</div>
                <p className="mt-1">
                  Designed around real intake, probate, and estate workflows.
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-emerald-300">Client-controlled</div>
                <p className="mt-1">
                  Clients grant and revoke firm access at any time.
                </p>
              </div>
            </div>
          </div>

          {/* Right side visual card */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-emerald-500/10 blur-3xl" />
            <div className="relative rounded-3xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/40 backdrop-blur">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <p className="text-xs text-slate-400">Client summary</p>
                  <p className="text-sm font-semibold">Jordan Blake</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 ring-1 ring-emerald-500/40">
                  Policies located
                </span>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <div>
                    <p className="font-medium text-slate-50">
                      Horizon Life Insurance Co.
                    </p>
                    <p className="text-slate-400">
                      Status: <span className="text-emerald-300">Active</span>{" "}
                      • Type: Term
                    </p>
                    <p className="text-slate-500">
                      Beneficiaries: Spouse, 2 children
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <p>Policy linked</p>
                    <p className="text-emerald-300">Verified by attorney</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <div>
                    <p className="font-medium text-slate-50">
                      Employer Group Policy
                    </p>
                    <p className="text-slate-400">
                      Status: Active • Type: Group
                    </p>
                    <p className="text-slate-500">
                      Through: Northbridge Logistics, Inc.
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <p>Beneficiaries on file</p>
                    <p className="text-amber-300">Self-reported</p>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/20 p-3 text-[11px] text-slate-400">
                  This registry summarizes your client&apos;s reported life
                  insurance relationships and beneficiaries as of{" "}
                  <span className="text-slate-200">Nov 30, 2025</span>. Policy
                  amounts are intentionally excluded.
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-[11px] text-slate-400">
                <span>Export to PDF for probate or estate files</span>
                <button className="rounded-full border border-slate-700 px-3 py-1 text-xs hover:border-emerald-400 hover:text-emerald-300">
                  Download client summary
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="mt-20 border-t border-slate-900 pt-12"
        >
          <h2 className="text-xl font-semibold">How it works</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            HeirVault is intentionally simple. It is not a claims platform or
            carrier portal. It is a clean registry that captures the essentials
            you actually need in practice.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs font-semibold text-emerald-300">
                Step 1
              </div>
              <h3 className="mt-1 text-sm font-semibold">
                Attorney invites client
              </h3>
              <p className="mt-2 text-xs text-slate-300">
                From your dashboard, create a client record and send them a
                secure invite link. They complete their registry online.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs font-semibold text-emerald-300">
                Step 2
              </div>
              <h3 className="mt-1 text-sm font-semibold">
                Client records policies & beneficiaries
              </h3>
              <p className="mt-2 text-xs text-slate-300">
                Clients enter insurer contact details, policy identifiers
                (optional), and beneficiaries. Policy amounts are never stored.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs font-semibold text-emerald-300">
                Step 3
              </div>
              <h3 className="mt-1 text-sm font-semibold">
                You get a clean, exportable summary
              </h3>
              <p className="mt-2 text-xs text-slate-300">
                View the registry by client, see which policies are
                self-reported vs. attorney-verified, and export a PDF for your
                case file.
              </p>
            </div>
          </div>
        </section>

        {/* For attorneys */}
        <section id="attorneys" className="mt-16 border-t border-slate-900 pt-12">
          <h2 className="text-xl font-semibold">Built for attorneys</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                Most life insurance ends up in your files as fragmented
                intake notes, email screenshots, or client recollection.
                HeirVault turns that into a structured, durable dataset
                you can actually rely on.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li>• Standardized intake for life insurance relationships</li>
                <li>• Clear distinction between self-reported and verified data</li>
                <li>• Designed for probate, estate planning, family law, and PI</li>
                <li>• Exportable summaries suitable for internal memos or exhibits</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-300">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-emerald-300">
                Example use cases
              </div>
              <ul className="space-y-2">
                <li>
                  <span className="font-semibold text-slate-50">
                    Probate:
                  </span>{" "}
                  quickly determine which insurers to notice and which
                  beneficiaries to contact.
                </li>
                <li>
                  <span className="font-semibold text-slate-50">
                    Estate planning:
                  </span>{" "}
                  align beneficiary designations with wills, trusts, and
                  titling.
                </li>
                <li>
                  <span className="font-semibold text-slate-50">
                    Wrongful death:
                  </span>{" "}
                  identify policies that may fund settlement structures or
                  support damages narratives.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="mt-16 border-t border-slate-900 pt-12">
          <h2 className="text-xl font-semibold">Security & privacy</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            This is not a marketing database and not a lead generator. It is a
            registry built to handle sensitive relationships cautiously.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3 text-xs text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <h3 className="text-sm font-semibold">Minimal data by design</h3>
              <p className="mt-2">
                No policy amounts, no premium data. Just insurers, identifiers,
                and named beneficiaries.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <h3 className="text-sm font-semibold">Encrypted & access-controlled</h3>
              <p className="mt-2">
                All data is encrypted in transit and at rest. Clients control
                which firms have access to their registry.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <h3 className="text-sm font-semibold">Audit trail</h3>
              <p className="mt-2">
                Every access and change can be logged, giving you a defensible
                history of who saw what, and when.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mt-16 border-t border-slate-900 pt-12">
          <h2 className="text-xl font-semibold">Simple, attorney-friendly pricing</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Free for individual clients. Flat monthly subscriptions for
            attorneys and firms. Billable as an ordinary software expense.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 text-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">
                Solo
              </div>
              <div className="mt-2 text-2xl font-semibold">$19</div>
              <div className="text-xs text-slate-400">per month</div>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li>• 1 attorney seat</li>
                <li>• Up to 100 active client registries</li>
                <li>• PDF exports</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-500 bg-slate-950/60 p-5 text-sm shadow-lg shadow-emerald-500/30">
              <div className="text-xs font-semibold uppercase text-emerald-300">
                Small firm
              </div>
              <div className="mt-2 text-2xl font-semibold">$69</div>
              <div className="text-xs text-slate-400">per month</div>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li>• Up to 5 attorney seats</li>
                <li>• Up to 500 active client registries</li>
                <li>• Shared firm dashboard</li>
                <li>• Priority support</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 text-sm">
              <div className="text-xs font-semibold uppercase text-slate-400">
                Enterprise
              </div>
              <div className="mt-2 text-2xl font-semibold">Let&apos;s talk</div>
              <div className="text-xs text-slate-400">custom pricing</div>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li>• Larger firms and multi-office practices</li>
                <li>• Higher registry limits</li>
                <li>• SSO, audit exports, and API access</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <p>Clients never pay to maintain their registry.</p>
            <Link
              href="/sign-up"
              className="rounded-full border border-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              Start a 14-day trial for your firm
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-900 pt-6 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} HeirVault. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/legal/terms" className="hover:text-emerald-300">
                Terms
              </Link>
              <Link href="/legal/privacy" className="hover:text-emerald-300">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
