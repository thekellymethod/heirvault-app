import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "HeirVault — Attorney Sign Up",
  description: "Create your HeirVault attorney account to manage client registries securely.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function AttorneySignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

