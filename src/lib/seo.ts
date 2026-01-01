import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://heirvault.app";
const siteName = "HeirVault";
const defaultDescription =
  "A secure registry where clients record who insures them and who their beneficiaries are—without exposing policy amounts. Find unclaimed life insurance policies easily.";

interface GenerateMetadataOptions {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

/**
 * Generate comprehensive SEO metadata for pages
 */
export function generateMetadata({
  title,
  description = defaultDescription,
  path = "",
  image = "/logo-hv.png",
  noIndex = false,
  type = "website",
  publishedTime,
  modifiedTime,
  author,
}: GenerateMetadataOptions): Metadata {
  const fullTitle = `${title} | ${siteName}`;
  const url = `${siteUrl}${path}`;
  const imageUrl = image.startsWith("http") ? image : `${siteUrl}${image}`;

  return {
    title: fullTitle,
    description,
    keywords: [
      "life insurance",
      "unclaimed life insurance",
      "policy registry",
      "beneficiary registry",
      "estate planning",
      "probate",
      "life insurance search",
      "policy locator",
      "estate administration",
      "attorney tools",
    ],
    authors: [{ name: author || siteName }],
    creator: siteName,
    publisher: siteName,
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      type,
      locale: "en_US",
      url,
      title: fullTitle,
      description,
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
      creator: "@heirvault",
      site: "@heirvault",
    },
    alternates: {
      canonical: url,
    },
    metadataBase: new URL(siteUrl),
    verification: {
      // Add your verification codes here when available
      // google: "your-google-verification-code",
      // yandex: "your-yandex-verification-code",
      // bing: "your-bing-verification-code",
    },
  };
}

/**
 * Generate structured data (JSON-LD) for rich snippets
 */
export function generateStructuredData({
  type,
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  author,
}: {
  type: "Organization" | "WebSite" | "WebPage" | "Article" | "Service";
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
}) {
  const base = {
    "@context": "https://schema.org",
    "@type": type,
    name: title,
    description,
    url,
    ...(image && { image: image.startsWith("http") ? image : `${siteUrl}${image}` }),
  };

  switch (type) {
    case "Organization":
      return {
        ...base,
        "@type": "Organization",
        name: siteName,
        url: siteUrl,
        logo: `${siteUrl}/logo-hv.png`,
        sameAs: [
          // Add social media links when available
          // "https://twitter.com/heirvault",
          // "https://linkedin.com/company/heirvault",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "Customer Service",
          email: "support@heirvault.app",
        },
      };

    case "WebSite":
      return {
        ...base,
        "@type": "WebSite",
        name: siteName,
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      };

    case "WebPage":
      return {
        ...base,
        "@type": "WebPage",
        ...(datePublished && { datePublished }),
        ...(dateModified && { dateModified }),
        ...(author && {
          author: {
            "@type": "Person",
            name: author,
          },
        }),
      };

    case "Service":
      return {
        ...base,
        "@type": "Service",
        serviceType: "Life Insurance Registry",
        provider: {
          "@type": "Organization",
          name: siteName,
        },
        areaServed: "US",
      };

    default:
      return base;
  }
}
