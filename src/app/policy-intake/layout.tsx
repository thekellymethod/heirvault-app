import type { Metadata } from "next";
import { generateMetadata } from "@/lib/seo";

export const metadata: Metadata = generateMetadata({
  title: "Submit Life Insurance Policy",
  description:
    "Submit your life insurance policy information to HeirVault. Upload documents or enter details manually. No account required. Secure, encrypted storage for estate planning.",
  path: "/policy-intake",
  image: "/vault-hv.png",
});

export default function PolicyIntakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
