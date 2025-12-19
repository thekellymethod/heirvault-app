import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Logo size="sm" showTagline={false} className="flex-row gap-2 mb-4" />
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Private, voluntary registry for life insurance policies and beneficiaries.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/legal/privacy" className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/disclaimers" className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                  Legal Disclaimers
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <ul className="space-y-2">
              <li className="text-xs text-slate-600 dark:text-slate-400">
                Private, voluntary registry
              </li>
              <li className="text-xs text-slate-600 dark:text-slate-400">
                Use is voluntary, not required by law
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Contact</h3>
            <ul className="space-y-2">
              <li>
                <a href="mailto:support@heirvault.com" className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                  support@heirvault.com
                </a>
              </li>
              <li>
                <a href="mailto:legal@heirvault.com" className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                  legal@heirvault.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} HeirVault. All rights reserved.
            </p>
            <div className="text-xs text-slate-500 dark:text-slate-400">
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

