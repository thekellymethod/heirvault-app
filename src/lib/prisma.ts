import "server-only";
import * as Prisma from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import "@/lib/env";

// Type for the extended Prisma client
// Use PrismaClient as the base type - extensions preserve all model types
type ExtendedPrismaClient = Prisma.PrismaClient;

declare global {
  var __prisma: ExtendedPrismaClient | undefined;
}

function createClient(): ExtendedPrismaClient {
  // Prisma reads DATABASE_URL automatically.
  // Prisma Accelerate uses PRISMA_ACCELERATE_URL if present.
  const options: { accelerateUrl?: string } = {};

  if (process.env.PRISMA_ACCELERATE_URL) {
    options.accelerateUrl = process.env.PRISMA_ACCELERATE_URL;
  } else if (!process.env.DATABASE_URL) {
    throw new Error(
      "Missing database connection. Set DATABASE_URL or PRISMA_ACCELERATE_URL."
    );
  }

  const base = new Prisma.PrismaClient({
    ...options,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  // Always extend so the returned type is consistent (prevents union headaches).
  const extended = process.env.PRISMA_ACCELERATE_URL
    ? base.$extends(withAccelerate())
    : base.$extends({});
  
  // Cast to PrismaClient - extensions preserve all model types and are compatible
  return extended as unknown as ExtendedPrismaClient;
}

export const prisma: ExtendedPrismaClient = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
