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
  
  // Only use Accelerate if URL is valid and contains a valid API key
  // Validate BEFORE creating PrismaClient to avoid runtime errors
  if (accelerateUrl) {
    // Check format
    const hasValidFormat = 
      (accelerateUrl.startsWith("prisma://") || accelerateUrl.startsWith("prisma+postgres://")) &&
      accelerateUrl.length > 50; // Basic sanity check
    
    // Check if api_key parameter exists and has a value (not just "api_key=")
    const apiKeyMatch = accelerateUrl.match(/[?&]api_key=([^&]+)/);
    const hasValidApiKey = apiKeyMatch && apiKeyMatch[1] && apiKeyMatch[1].length > 10;
    
    const isValidAccelerateUrl = hasValidFormat && hasValidApiKey;
    
    if (!isValidAccelerateUrl) {
      // Invalid Accelerate URL format or missing API key - log warning and fall back
      console.warn(
        `[Prisma] PRISMA_ACCELERATE_URL is set but invalid. ` +
        `Expected format: prisma://...?api_key=YOUR_KEY or prisma+postgres://...?api_key=YOUR_KEY ` +
        `Got: ${accelerateUrl.substring(0, 60)}... ` +
        `Falling back to direct connection adapter.`
      );
      // Fall through to adapter creation
    } else {
      // URL format and API key look valid - use Accelerate
      return new PrismaClient({
        accelerateUrl,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
    }
  }

  // Use adapter with direct connection (fallback or primary)
  // Ensure SSL is enabled for Supabase connections
  let connectionString = url;
  try {
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has("sslmode")) {
      urlObj.searchParams.set("sslmode", "require");
      connectionString = urlObj.toString();
    }
  } catch {
    // If URL parsing fails, append sslmode to connection string
    if (!url.includes("sslmode=")) {
      const separator = url.includes("?") ? "&" : "?";
      connectionString = `${url}${separator}sslmode=require`;
    }
  }
  
  const pool = new Pool({ 
    connectionString,
    // Explicitly enable SSL for Supabase
    ssl: process.env.NODE_ENV === "production" || url.includes("supabase") 
      ? { rejectUnauthorized: false } // Supabase uses self-signed certs
      : undefined,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// Avoid creating new clients on hot reload in dev
export const prisma = global.__prisma ?? makePrisma();

if (process.env.NODE_ENV !== "production") global.__prisma = prisma;
