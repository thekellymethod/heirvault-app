import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata = genMeta({
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
