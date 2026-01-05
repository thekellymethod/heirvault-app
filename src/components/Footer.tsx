import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: "#1A2A45", backgroundColor: "#0B1220" }}>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Logo size="sm" showTagline={false} className="flex-row mb-4" />
            <p className="text-xs" style={{ color: "#E1B75A" }}>
              Private, voluntary registry for life insurance policies and beneficiaries.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#E1B75A", fontFamily: "'Playfair Display', Georgia, serif" }}>Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/legal/terms" className="text-xs transition hover:opacity-80" style={{ color: "#F2D48B" }}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="text-xs transition hover:opacity-80" style={{ color: "#F2D48B" }}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/disclaimers" className="text-xs transition hover:opacity-80" style={{ color: "#F2D48B" }}>
                  Legal Disclaimers
                </Link>
              </li>
              <li>
                <Link href="/legal/information-release" className="text-xs transition hover:opacity-80" style={{ color: "#F2D48B" }}>
                  Information Release Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/acceptable-use" className="text-xs transition hover:opacity-80" style={{ color: "#F2D48B" }}>
                  Acceptable Use Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/attorney-agreement" className="text-xs transition hover:opacity-80" style={{ color: "#F2D48B" }}>
                  Attorney Use Agreement
                </Link>
              </li>
              <li>
                <Link href="/legal/compliance" className="text-xs transition hover:opacity-80" style={{ color: "#F2D48B" }}>
                  Security & Compliance
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <ul className="space-y-2">
              <li className="text-xs" style={{ color: "#E1B75A" }}>
                Private, voluntary registry
              </li>
              <li className="text-xs" style={{ color: "#E1B75A" }}>
                Use is voluntary, not required by law
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#E1B75A", fontFamily: "'Playfair Display', Georgia, serif" }}>Contact</h3>
            <ul className="space-y-2">
              <li>
                <a href="mailto:support@heirvault.com" className="text-xs transition hover:opacity-80" style={{ color: "#F2D48B" }}>
                  support@heirvault.com
                </a>
              </li>
              <li>
                <a href="mailto:legal@heirvault.com" className="text-xs transition hover:opacity-80" style={{ color: "#F2D48B" }}>
                  legal@heirvault.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t" style={{ borderColor: "#1A2A45" }}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <p className="text-xs" style={{ color: "#E1B75A" }}>
              © {new Date().getFullYear()} HeirVault. All rights reserved.
            </p>
            <div className="text-xs text-center md:text-right" style={{ color: "#E1B75A" }}>
              <p>
                HeirVault is not affiliated with NAIC, MIB, or any insurer. 
                This is a private, voluntary registry service.
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <Link
              href="/update-policy"
              className="btn-primary inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold"
            >
              Update Life Insurance Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

