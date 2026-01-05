// src/app/registry/page.tsx
import React from "react";
import Image from "next/image";

export default function RegistryPolicySummaryPage() {
  return (
    <main className="min-h-screen bg-[#f4efe9] text-[#1b1f2a]">
      {/* Top bar */}
      <header className="relative overflow-hidden border-b border-black/10 bg-[#1f2a3a] text-[#f6f1ea]">
        {/* Subtle texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 45%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.12), transparent 50%), radial-gradient(circle at 50% 90%, rgba(0,0,0,0.35), transparent 55%)",
          }}
        />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <Image
                src="/heirvault-logo.png"
                alt="HeirVault Registry Seal"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="leading-tight">
              <div className="font-serif text-xl tracking-[0.12em]">HEIRVAULT</div>
              <div className="text-[11px] tracking-[0.18em] text-[#d8cfbf]">
                REGISTRY
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden items-center gap-6 text-sm text-[#e8e0d4] md:flex">
            <a className="hover:text-white" href="/registry">
              Registry
            </a>
            <a className="text-white underline underline-offset-8" href="/registry">
              Policy Summary
            </a>
            <a className="hover:text-white" href="/documents">
              Documents
            </a>
            <a className="hover:text-white" href="/reports">
              Reports
            </a>
            <a className="hover:text-white" href="/account">
              Account
            </a>
          </nav>

          {/* Button */}
          <a
            href="/logout"
            className="rounded-md border border-[#b79a5b]/60 bg-[#2a364a] px-3 py-2 text-xs tracking-[0.14em] text-[#f3eadc] shadow-sm hover:bg-[#2f3d56]"
          >
            LOG OUT
          </a>
        </div>

        {/* Hero */}
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 pb-10 pt-6 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <h1 className="font-serif text-4xl leading-tight md:text-5xl">
              The Life Insurance
              <br />
              Registry for Estates.
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-[#e6ddcf]">
              HeirVault ensures that life insurance benefits reach the right hands.
            </p>
            <div className="pt-2">
              <a
                href="#policy-summary"
                className="inline-flex items-center justify-center rounded-md border border-[#b79a5b]/80 bg-[#b79a5b] px-4 py-2 text-sm font-medium text-[#1f2a3a] shadow hover:brightness-105"
              >
                Access Your Registry
              </a>
            </div>
          </div>

          {/* Right visual */}
          <div className="relative">
            <div className="aspect-[16/9] overflow-hidden rounded-xl border border-black/15 bg-[#f6f1ea] shadow-sm">
              <div className="flex h-full w-full items-center justify-center">
                {/* Replace with your real wax/seal asset when ready */}
                <div className="relative">
                  <div className="absolute -inset-6 rounded-full bg-black/10 blur-2xl" />
                  <div className="rounded-2xl border border-black/10 bg-white px-10 py-8 shadow-sm">
                    <div className="flex items-center justify-center">
                      <div className="rounded-full bg-[#1f2a3a] p-5 shadow-inner">
                        <div className="relative h-20 w-20">
                          <Image
                            src="/heirvault-logo.png"
                            alt="HeirVault Registry Seal"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-center text-[11px] tracking-[0.18em] text-[#6a6258]">
                      HEIRVAULT REGISTRY SEAL
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* subtle envelope edge */}
            <div className="pointer-events-none absolute -right-6 -top-6 hidden h-24 w-24 rotate-12 rounded-2xl border border-white/15 bg-white/5 md:block" />
          </div>
        </div>
      </header>

      {/* Registry content */}
      <section id="policy-summary" className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs tracking-[0.18em] text-[#6a6258]">
              Registry / Policy Summary
            </div>
            <h2 className="mt-2 font-serif text-4xl">Policy Summary</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#3b3f46]">
              The following life insurance policies are registered with HeirVault for your estate.
              Please review the insurance details and designated beneficiaries for accuracy. This
              registry is maintained to ensure beneficiary clarity.
            </p>
          </div>

          <a
            href="/reports/generate"
            className="mt-2 hidden items-center gap-2 rounded-md border border-black/15 bg-white px-4 py-2 text-sm text-[#1f2a3a] shadow-sm hover:bg-[#fbf7f2] md:inline-flex"
            title="Generate Report"
          >
            Generate Report <span aria-hidden>»</span>
          </a>
        </div>

        {/* Search */}
        <div className="mt-8 flex items-center gap-3">
          <div className="relative w-full">
            <input
              className="w-full rounded-md border border-black/10 bg-white px-10 py-3 text-sm shadow-sm outline-none placeholder:text-[#8c857b] focus:border-[#b79a5b]/60 focus:ring-2 focus:ring-[#b79a5b]/20"
              placeholder="Find by name, company, or policy…"
            />
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7368]">
              <SearchIcon />
            </div>
          </div>
          <button
            className="rounded-md border border-black/10 bg-white p-3 shadow-sm hover:bg-[#fbf7f2]"
            aria-label="Search"
          >
            <SearchIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex items-center gap-6 border-b border-black/10 pb-2 text-sm">
          <Tab active>Active</Tab>
          <Tab>Contingent</Tab>
          <Tab>Terminated</Tab>
          <Tab>All</Tab>
        </div>

        {/* Ledger table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="grid grid-cols-6 gap-0 border-b border-black/10 bg-[#fbf7f2] px-4 py-3 text-[11px] font-semibold tracking-[0.14em] text-[#5c554c]">
            <div>POLICY HOLDER</div>
            <div>POLICY</div>
            <div>INSURANCE COMPANY</div>
            <div>BENEFICIARY</div>
            <div>STATUS</div>
            <div className="text-right">ACTION</div>
          </div>

          <Row holder="Thomas Caldwell" policy="844-1297-24523" company="MassMutual" beneficiary="Jamie Caldwell" status="Active" />
          <Row holder="Sarah Elliott" policy="844-1292-439.6" company="New York Life" beneficiary="Jamie Caldwell" status="Contingent" />
          <Row holder="John Parker" policy="844-1297-3324" company="Northwestern Mutual" beneficiary="Jamie Caldwell" status="Contingent" />
          <Row holder="Emily Warner" policy="844-1297-4569" company="Prudential" beneficiary="Jamie Caldwell" status="Contingent" />

          <div className="flex items-center justify-between border-t border-black/10 px-4 py-3 text-xs text-[#6a6258]">
            <div>Showing 4 policies</div>
            <div className="flex items-center gap-2">
              <button className="rounded-md border border-black/10 bg-white px-2 py-1 hover:bg-[#fbf7f2]">
                Previous
              </button>
              <button className="rounded-md border border-[#b79a5b]/60 bg-[#fbf7f2] px-2 py-1 text-[#1f2a3a]">
                1
              </button>
              <button className="rounded-md border border-black/10 bg-white px-2 py-1 hover:bg-[#fbf7f2]">
                2
              </button>
              <button className="rounded-md border border-black/10 bg-white px-2 py-1 hover:bg-[#fbf7f2]">
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Registry artifacts */}
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          <ArtifactCard
            title="Registry Certificate"
            body="Generate a certified summary of all life insurance policies registered with HeirVault."
            cta="Download Certificate"
            href="/registry/certificate"
            icon={<CertificateIcon />}
          />
          <ArtifactCard
            title="Document Archive"
            body="Access and manage estate documents, such as beneficiary designations & instructions."
            cta="View Archive"
            href="/documents"
            icon={<ArchiveIcon />}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative mt-10 border-t border-black/10 bg-[#1f2a3a] text-[#e8e0d4]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.10]">
          <div className="absolute bottom-6 right-8">
            <div className="relative h-28 w-28 opacity-20">
              <Image
                src="/heirvault-logo.png"
                alt="HeirVault Registry Seal"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <Image
                  src="/heirvault-logo.png"
                  alt="HeirVault"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="font-serif text-lg tracking-[0.12em]">HEIRVAULT</div>
            </div>

            <FooterCol
              title="Registry"
              links={[
                ["Policy Summary", "/registry"],
                ["Beneficiaries", "/beneficiaries"],
                ["Documents", "/documents"],
                ["Reports", "/reports"],
              ]}
            />

            <FooterCol
              title="Company"
              links={[
                ["Privacy Policy", "/legal/privacy"],
                ["Terms of Service", "/legal/terms"],
                ["Support", "/support"],
              ]}
            />

            <div>
              <div className="text-[11px] font-semibold tracking-[0.18em] text-[#d8cfbf]">
                CONTACT
              </div>
              <div className="mt-3 space-y-2 text-sm text-[#e8e0d4]">
                <div>1.600-123-4567</div>
                <div className="text-[#d8cfbf]">contact@heirvault.com</div>
              </div>
            </div>
          </div>

          <div className="mt-10 text-xs text-[#bfb6a6]">
            © {new Date().getFullYear()} HeirVault. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}

function Tab({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      className={[
        "pb-2",
        active
          ? "border-b-2 border-[#b79a5b] font-semibold text-[#1f2a3a]"
          : "text-[#6a6258] hover:text-[#1f2a3a]",
      ].join(" ")}
      type="button"
    >
      {children}
    </button>
  );
}

function Row({
  holder,
  policy,
  company,
  beneficiary,
  status,
}: {
  holder: string;
  policy: string;
  company: string;
  beneficiary: string;
  status: "Active" | "Contingent" | "Terminated" | string;
}) {
  return (
    <div className="grid grid-cols-6 items-center gap-0 border-b border-black/10 px-4 py-3 text-sm">
      <div className="flex items-center gap-2 font-medium text-[#1f2a3a]">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#fbf7f2] text-[#6a6258]">
          📄
        </span>
        {holder}
      </div>
      <div className="text-[#3b3f46]">{policy}</div>
      <div className="text-[#3b3f46]">{company}</div>
      <div className="text-[#3b3f46]">{beneficiary}</div>
      <div>
        <span
          className={[
            "inline-flex items-center rounded-full px-2 py-1 text-xs",
            status === "Active"
              ? "bg-[#e7efe6] text-[#2c5a31]"
              : status === "Contingent"
              ? "bg-[#efe9df] text-[#6a4f1d]"
              : "bg-[#f1e3e3] text-[#6a2b2b]",
          ].join(" ")}
        >
          {status}
        </span>
      </div>
      <div className="text-right">
        <a
          href="/registry/policy/1"
          className="rounded-md border border-black/10 bg-white px-3 py-1 text-xs text-[#1f2a3a] shadow-sm hover:bg-[#fbf7f2]"
        >
          View
        </a>
      </div>
    </div>
  );
}

function ArtifactCard({
  title,
  body,
  cta,
  href,
  icon,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="mt-1 rounded-lg border border-black/10 bg-[#fbf7f2] p-3 text-[#6a6258]">
          {icon}
        </div>
        <div className="flex-1">
          <div className="font-serif text-2xl">{title}</div>
          <p className="mt-2 text-sm leading-relaxed text-[#3b3f46]">{body}</p>
          <div className="mt-4">
            <a
              href={href}
              className="inline-flex items-center justify-center rounded-md border border-[#b79a5b]/80 bg-[#b79a5b] px-4 py-2 text-sm font-medium text-[#1f2a3a] shadow hover:brightness-105"
            >
              {cta}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-[0.18em] text-[#d8cfbf]">
        {title.toUpperCase()}
      </div>
      <div className="mt-3 space-y-2 text-sm">
        {links.map(([label, href]) => (
          <a key={href} href={href} className="block text-[#e8e0d4] hover:text-white">
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16.5 16.5 21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h10v6H7V3Z" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 9h10v12H7V9Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M9 12h6M9 15h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16v14H4V7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 7l2-4h12l2 4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M9 12h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
