import "server-only";
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import "@/lib/env";

// Create a stable exported type that matches whatever $extends returns.
type ExtendedPrismaClient = ReturnType<PrismaClient["$extends"]>;

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

  const base = new PrismaClient(options);

  // Always extend so the returned type is consistent (prevents union headaches).
  return process.env.PRISMA_ACCELERATE_URL
    ? base.$extends(withAccelerate())
    : base.$extends({});
}

export const prisma: ExtendedPrismaClient = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
