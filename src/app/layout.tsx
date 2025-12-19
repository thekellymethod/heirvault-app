import { type Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Playfair_Display } from "next/font/google";
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

export const metadata: Metadata = {
  title: "HeirVault - Life Insurance Relationship Registry",
  description:
    "A secure registry where clients record who insures them and who their beneficiaries are—without exposing policy amounts.",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider signInUrl="/attorney/sign-in" signUpUrl="/attorney/sign-up">
      <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
        <body className="bg-paper-50 font-sans text-slateui-800 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
