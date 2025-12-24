// next.config.mjs
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [],
    unoptimized: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

const isProd =
  process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

const hasAuthToken =
  typeof process.env.SENTRY_AUTH_TOKEN === "string" &&
  process.env.SENTRY_AUTH_TOKEN.length > 0;

// If there is no token, do not apply Sentry config at all (prevents build failure)
const finalConfig = hasAuthToken
  ? withSentryConfig(
      nextConfig,
      {
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG || "robert-kelly-dc-llc",
        project: process.env.SENTRY_PROJECT || "javascript-nextjs",

        // Only upload in production
        dryRun: !isProd,

        // Only print logs for uploading source maps in CI
        silent: !process.env.CI,
      },
      {
        widenClientFileUpload: true,
        hideSourceMaps: true,
        silent: !process.env.CI,

        webpack: {
          treeshake: {
            removeDebugLogging: true,
          },
          automaticVercelMonitors: true,
        },
      }
    )
  : nextConfig;

export default finalConfig;
