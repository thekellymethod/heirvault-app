import { withSentryConfig } from "@sentry/nextjs";
import { fileURLToPath } from "url";
import path from "path";

// ESM-safe __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin Turbopack root to prevent picking wrong workspace
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [],
    unoptimized: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    // Build CSP directive
    // Note: 
    // - 'unsafe-eval' is needed for some libraries like tesseract.js (OCR)
    // - 'unsafe-inline' is required for Next.js inline scripts (__NEXT_DATA__, hydration)
    //   Next.js requires inline scripts unless using middleware with nonces or experimental SRI
    // - Clerk CDN must be allowed for script-src to load Clerk.js
    // - Cloudflare Turnstile (challenges.cloudflare.com): Clerk bot protection / CAPTCHA — required or sign-in CAPTCHA fails to load
    const turnstile = "https://challenges.cloudflare.com";
    const scriptSrc = `'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com ${turnstile}`;

    const csp = [
      `default-src 'self'`,
      `script-src ${scriptSrc}`,
      `style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com`,
      `img-src 'self' data: blob: https:`,
      `font-src 'self' data: https://*.clerk.accounts.dev https://*.clerk.com`,
      `connect-src 'self' https: wss: https://*.clerk.accounts.dev https://*.clerk.com https://*.supabase.co https://api.openai.com https://*.sentry.io ${turnstile}`,
      `frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com ${turnstile}`,
      `worker-src 'self' blob:`,
      `child-src 'self' blob: https://*.clerk.accounts.dev https://*.clerk.com ${turnstile}`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `frame-ancestors 'self'`,
      `upgrade-insecure-requests`,
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Additional security headers
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Download-Options", value: "noopen" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
};

// Only enable Sentry release/sourcemap upload when explicitly configured.
// Prevents Vercel builds from failing due to missing/wrong tokens or project config.
const sentryEnabled =
  !!process.env.SENTRY_AUTH_TOKEN &&
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT;

const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
};

export default sentryEnabled
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
