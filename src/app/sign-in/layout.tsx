import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - HeirVault",
  description: "Sign in to your HeirVault account",
  robots: {
    index: false,
    follow: false,
  },
  other: {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

