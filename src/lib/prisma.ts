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
  if (accelerateUrl) {
    const isValidAccelerateUrl = 
      (accelerateUrl.startsWith("prisma://") || accelerateUrl.startsWith("prisma+postgres://")) &&
      accelerateUrl.includes("api_key=");
    
    if (isValidAccelerateUrl) {
      try {
        // Use Accelerate if available and valid
        return new PrismaClient({
          accelerateUrl,
          log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
        });
      } catch (error) {
        // If Accelerate fails to initialize, fall back to adapter
        console.warn("[Prisma] Accelerate URL invalid, falling back to adapter:", error);
      }
    } else {
      // Invalid Accelerate URL format - log warning and fall back
      console.warn(
        `[Prisma] PRISMA_ACCELERATE_URL is set but invalid format. ` +
        `Expected format: prisma://...?api_key=... or prisma+postgres://...?api_key=... ` +
        `Got: ${accelerateUrl.substring(0, 50)}...`
      );
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
