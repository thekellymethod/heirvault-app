import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { generateMetadata as genMeta, generateStructuredData } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = genMeta({
  title: "HeirVault - Life Insurance Relationship Registry",
  description:
    "A secure registry where clients record who insures them and who their beneficiaries are—without exposing policy amounts. Find unclaimed life insurance policies easily with our professional workflow.",
  path: "/",
  image: "/vault-hv.png",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationSchema = generateStructuredData({
    type: "Organization",
    title: "HeirVault",
    description: "A secure registry for life insurance policy information and beneficiary designations",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://heirvault.app",
    image: "/logo-hv.png",
  });

  const websiteSchema = generateStructuredData({
    type: "WebSite",
    title: "HeirVault",
    description: "Find unclaimed life insurance policies easily with our secure registry",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://heirvault.app",
  });

  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} 
      signUpUrl="/sign-up"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
          />
        </head>
        <body className="bg-paper-50 font-sans text-slateui-800 antialiased">
          {children}

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#fff",
                color: "#253246",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                padding: "16px",
                fontSize: "14px",
              },
              success: {
                iconTheme: { primary: "#10b981", secondary: "#fff" },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#fff" },
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
