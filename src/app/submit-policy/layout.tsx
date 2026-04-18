import type { ReactNode } from "react";

export default function SubmitPolicyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-paper-50 via-paper-100 to-slateui-100 text-ink-900">
      {children}
    </div>
  );
}
