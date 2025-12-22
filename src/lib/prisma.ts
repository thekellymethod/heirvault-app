import "server-only";
// @ts-expect-error - PrismaClient is generated and may not be in types until after generation
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

declare global {
  var __prisma: ReturnType<typeof createClient> | undefined;
}

function createClient() {
  // Prisma 7: Use accelerateUrl option if available, otherwise use empty object
  // (Prisma reads DATABASE_URL from environment automatically)
  const options: { accelerateUrl?: string } = {};
  
  if (process.env.PRISMA_ACCELERATE_URL) {
    options.accelerateUrl = process.env.PRISMA_ACCELERATE_URL;
  } else if (!process.env.DATABASE_URL) {
    throw new Error(
      "Missing database connection. Please set either DATABASE_URL or PRISMA_ACCELERATE_URL in your environment variables."
    );
  }
  
  // Create client with options
  const client = new PrismaClient(options);
  
  // If using Accelerate, extend with Accelerate extension
  if (process.env.PRISMA_ACCELERATE_URL) {
    return client.$extends(withAccelerate());
  }
  
  return client;
}

export const prisma = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
