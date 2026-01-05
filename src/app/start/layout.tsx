import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start Free | HeirVault",
  description:
    "Start a free policy registry for an estate. Track, verify, and export a clean Policy Registry Summary.",
};

export default function StartFreeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
