import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function makePrisma() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is missing at runtime.");

  // Check for Prisma Accelerate URL first
  const accelerateUrl = process.env.PRISMA_ACCELERATE_URL?.trim();
  
  if (accelerateUrl && (accelerateUrl.startsWith("prisma://") || accelerateUrl.startsWith("prisma+postgres://"))) {
    // Use Accelerate if available
    return new PrismaClient({
      accelerateUrl,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  // Otherwise use adapter with direct connection
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// Avoid creating new clients on hot reload in dev
export const prisma = global.__prisma ?? makePrisma();

if (process.env.NODE_ENV !== "production") global.__prisma = prisma;
