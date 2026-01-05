"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useState } from "react";

export default function StartFreePage() {
  return (
    <main className="min-h-screen bg-[#05070c] text-white">
      {/* subtle background glow */}
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#C9A227]/10 blur-[120px]" />
        <div className="absolute top-1/3 left-10 h-[420px] w-[420px] rounded-full bg-white/5 blur-[140px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <Logo size="sm" variant="icon-only" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide" style={{ color: "#E1B75A", fontFamily: "'Playfair Display', Georgia, serif" }}>HeirVault</div>
            <div className="text-[11px] text-white/60">
              Life Insurance Policy Registry
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/attorney/sign-in"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10 transition"
          >
            Log in
          </Link>
          <Link
            href="/attorney/sign-up"
            className="rounded-full bg-[#C9A227] px-4 py-2 text-sm font-semibold text-black hover:brightness-95 transition"
          >
            Start free
          </Link>
        </nav>
      </header>

      {/* Content */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr]">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80">
              <span className="inline-block h-2 w-2 rounded-full bg-[#C9A227]" />
              Designed for probate attorneys, estate administrators, and firm staff
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-5xl" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Start a free policy registry in minutes.
            </h1>

            <p className="mt-4 max-w-xl text-base text-white/70">
              Create an estate registry, log policies, track verification, and
              export a court-clean Policy Registry Summary—without chasing PDFs,
              emails, or unanswered calls.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <StartFreeEmailForm />
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/90 hover:bg-white/10 transition"
              >
                Review pricing
              </Link>
            </div>

            <p className="mt-3 text-xs text-white/50">
              No credit card required to start. You can enable billing when you're ready.
            </p>

            {/* What you get */}
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <FeatureCard
                title="Policy-first registry"
                desc="Track policies per estate with standardized status and a clean audit trail."
              />
              <FeatureCard
                title="Verification status"
                desc="Unknown → Requested → Verified → Paid/Denied. No ambiguity."
              />
              <FeatureCard
                title="Client upload links"
                desc="Collect policy proof without inbox chaos. Files attach to the correct policy record."
              />
              <FeatureCard
                title="Export that looks legitimate"
                desc="Generate a structured Policy Registry Summary PDF suitable for internal review or filing."
              />
            </div>

            {/* How free works */}
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>How "Start Free" works</h2>
              <div className="mt-3 grid gap-3 text-sm text-white/70">
                <div className="flex gap-3">
                  <StepBadge>1</StepBadge>
                  <div>
                    <div className="text-white/90 font-medium">Create your firm workspace</div>
                    <div className="text-white/60">
                      Set your firm name and start your first estate registry.
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <StepBadge>2</StepBadge>
                  <div>
                    <div className="text-white/90 font-medium">Use core registry features immediately</div>
                    <div className="text-white/60">
                      Log policies, attach proof, and export a summary.
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <StepBadge>3</StepBadge>
                  <div>
                    <div className="text-white/90 font-medium">Enable billing when you're ready</div>
                    <div className="text-white/60">
                      Billing unlocks ongoing active registries beyond the included amount.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Pricing + trust */}
          <aside className="lg:mt-2">
            <div className="rounded-2xl border border-[#C9A227]/25 bg-gradient-to-b from-white/5 to-transparent p-6 shadow-[0_0_0_1px_rgba(201,162,39,.08)]">
              <div className="text-sm text-white/70">Registry Base</div>
              <div className="mt-2 flex items-end gap-2">
                <div className="text-4xl font-semibold">$39</div>
                <div className="pb-1 text-sm text-white/60">/ month per firm</div>
              </div>

              <div className="mt-6 text-sm font-semibold text-white/90">
                Includes:
              </div>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li className="flex gap-2">
                  <Check /> Up to <span className="text-white/90 font-medium">5 active</span> policy registries (estates)
                </li>
                <li className="flex gap-2">
                  <Check /> Unlimited policies per registry
                </li>
                <li className="flex gap-2">
                  <Check /> Unlimited policy-attached documents
                </li>
                <li className="flex gap-2">
                  <Check /> Policy status tracking
                </li>
                <li className="flex gap-2">
                  <Check /> Policy Registry Summary export (PDF)
                </li>
                <li className="flex gap-2">
                  <Check /> Client upload link per registry
                </li>
                <li className="flex gap-2">
                  <Check /> 1 admin + 2 staff users
                </li>
                <li className="flex gap-2">
                  <Check /> Audit logging for uploads & exports
                </li>
              </ul>

              <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-white/70">Additional active registries</div>
                  <div className="font-semibold text-white">$8 / registry / month</div>
                </div>
                <div className="mt-2 text-xs text-white/50">
                  Closed estates can be archived and kept read-only.
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href="/attorney/sign-up"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[#C9A227] px-5 py-3 text-sm font-semibold text-black hover:brightness-95 transition"
                >
                  Create your account
                </Link>
                <div className="mt-2 text-center text-xs text-white/50">
                  Start free. Add billing later.
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-sm font-semibold text-white/90">Security & trust</h3>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li className="flex gap-2"><Dot /> Firm-level tenant isolation</li>
                <li className="flex gap-2"><Dot /> Role-based access controls</li>
                <li className="flex gap-2"><Dot /> Time-limited file access</li>
                <li className="flex gap-2"><Dot /> Action logging for key events</li>
              </ul>
              <p className="mt-3 text-xs italic text-white/50">
                Security isn't a marketing claim—it's built into the architecture.
              </p>
            </div>
          </aside>
        </div>

        {/* Footer CTA */}
        <div className="mt-14 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Stop losing time chasing life insurance policies.
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Build a registry that shows exactly what exists—and what doesn't.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/attorney/sign-up"
              className="rounded-xl bg-[#C9A227] px-6 py-3 text-sm font-semibold text-black hover:brightness-95 transition"
            >
              Start free
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/50">
            No credit card required for initial access.
          </p>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm font-semibold text-white/90">{title}</div>
      <div className="mt-2 text-sm text-white/65">{desc}</div>
    </div>
  );
}

function StepBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C9A227] text-xs font-bold text-black">
      {children}
    </div>
  );
}

function Check() {
  return (
    <span className="mt-[2px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#C9A227]/15 text-[#C9A227]">
      <span className="text-[11px] leading-none">✓</span>
    </span>
  );
}

function Dot() {
  return (
    <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-[#C9A227]" />
  );
}

/**
 * Start Free email capture:
 * - Captures email (optional)
 * - POSTs to /api/leads (optional)
 * - Redirects to /attorney/sign-up?email=...
 */
function StartFreeEmailForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const emailValue = email.trim();

    if (emailValue) {
      try {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailValue, source: "start_free" }),
        });
      } catch {
        // silently ignore lead capture errors
      }
    }

    // Redirect to sign-up with email pre-filled if provided
    const params = emailValue ? `?email=${encodeURIComponent(emailValue)}` : "";
    window.location.href = `/attorney/sign-up${params}`;
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl gap-2">
      <input
        name="email"
        type="email"
        placeholder="Work email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#C9A227]/50 focus:outline-none focus:ring-2 focus:ring-[#C9A227]/20 transition"
        disabled={isSubmitting}
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="shrink-0 rounded-xl bg-[#C9A227] px-6 py-3 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isSubmitting ? "Starting..." : "Start free"}
      </button>
    </form>
  );
}
