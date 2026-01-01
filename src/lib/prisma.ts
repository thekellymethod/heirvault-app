import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  var __prisma: PrismaClient | undefined; // Prisma client singleton for dev hot-reload
}

function makePrisma() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is missing at runtime.");

  // Check for Prisma Accelerate URL first
  const accelerateUrl = process.env.PRISMA_ACCELERATE_URL?.trim();
  
  // Only use Accelerate if URL is valid and contains API key
  // Validate BEFORE creating PrismaClient to avoid runtime errors
  if (accelerateUrl) {
    const isValidAccelerateUrl = 
      (accelerateUrl.startsWith("prisma://") || accelerateUrl.startsWith("prisma+postgres://")) &&
      accelerateUrl.includes("api_key=") &&
      accelerateUrl.length > 50; // Basic sanity check
    
    if (!isValidAccelerateUrl) {
      // Invalid Accelerate URL format - log warning and fall back
      console.warn(
        `[Prisma] PRISMA_ACCELERATE_URL is set but invalid format. ` +
        `Expected format: prisma://...?api_key=... or prisma+postgres://...?api_key=... ` +
        `Got: ${accelerateUrl.substring(0, 50)}... ` +
        `Falling back to direct connection adapter.`
      );
      // Fall through to adapter creation
    } else {
      // URL format looks valid - try to use Accelerate
      // Note: Prisma will validate the API key when the client is first used
      // If it fails, we'll catch it and the app will error, but at least we tried
      return new PrismaClient({
        accelerateUrl,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
    }
  }

  // Use adapter with direct connection (fallback or primary)
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
