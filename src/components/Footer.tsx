import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-hv-bg py-8 md:py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <div>
            <Logo size="sm" colorMode="light" variant="default" showTagline={true} className="mb-4 flex-row opacity-90" />
            <p className="mt-4 text-[13px] leading-relaxed text-hv-text">
              HeirVault — a <strong className="font-medium">private, voluntary, registry </strong> for life insurance policies and beneficiaries.
            </p>
          </div>

          <div>
            <h3 className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-hv-text-muted">Legal</h3>
            <ul className="mt-4 space-y-1.5">
              <li>
                <Link href="/legal/terms" className="text-[13px] text-hv-text-secondary font-medium transition hover:text-hv-text">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="text-[13px] text-hv-text- secondary font-medium transition hover:text-hv-text">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/disclaimers" className="text-[13px] text-hv-text-muted transition hover:text-hv-text">
                  Legal Disclaimers
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/information-release"
                  className="text-[13px] text-hv-text-muted transition hover:text-hv-text"
                >
                  Information Release Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/acceptable-use" className="text-[13px] text-hv-text-muted transition hover:text-hv-text">
                  Acceptable Use Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/attorney-agreement"
                  className="text-[13px] text-hv-text-muted transition hover:text-hv-text"
                >
                  Attorney Use Agreement
                </Link>
              </li>
              <li>
                <Link href="/legal/compliance" className="text-[13px] text-hv-text-muted transition hover:text-hv-text">
                  Security & Compliance
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-hv-text-muted">Registry</h3>
            <p className="mt-4 text-[13px] leading-relaxed text-hv-text-muted">
              Private, voluntary registry. Use is voluntary and not required by law. HeirVault is not affiliated with NAIC,
              MIB, or any insurer.
            </p>
          </div>

          <div>
            <h3 className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-hv-text-muted">Contact</h3>
            <ul className="mt-4 space-y-1.5">
              <li>
                <a href="mailto:support@heirvault.com" className="text-[13px] text-hv-text-secondary transition hover:text-hv-text">
                  support@heirvault.com
                </a>
              </li>
              <li>
                <a href="mailto:legal@heirvault.com" className="text-[13px] text-hv-text-secondary transition hover:text-hv-text">
                  legal@heirvault.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/[0.06] pt-4">
          <p className="text-center text-[11px] leading-relaxed text-hv-text-muted">
  © {new Date().getFullYear()} HeirVault. All rights reserved.
  <span className="block mt-1 text-[10px] text-white/30">
    System of record for life insurance policy tracking.
  </span>
        </p>
        </div>
      </div>
    </footer>
  );
}
