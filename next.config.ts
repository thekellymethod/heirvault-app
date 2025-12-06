import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow webhook routes to access raw body for Stripe signature verification
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Set workspace root to silence lockfile warning
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
