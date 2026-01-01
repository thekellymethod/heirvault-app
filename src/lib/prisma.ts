import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  var __prisma: PrismaClient | undefined; // Prisma client singleton for dev hot-reload
  var __prisma_db_url: string | undefined; // Track DB URL to detect changes
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
  
  // Check if sslmode is already in the connection string
  if (url && !connectionString.includes("sslmode=")) {
    try {
      // Try to parse as URL and add sslmode parameter
      const urlObj = new URL(connectionString);
      if (urlObj && urlObj.searchParams) {
        urlObj.searchParams.set("sslmode", "require");
        connectionString = urlObj.toString();
      } else {
        // URL parsing succeeded but object is invalid - append manually
        const separator = connectionString.includes("?") ? "&" : "?";
        connectionString = `${connectionString}${separator}sslmode=require`;
      }
    } catch {
      // If URL parsing fails (e.g., not a standard URL format), append sslmode manually
      const separator = connectionString.includes("?") ? "&" : "?";
      connectionString = `${connectionString}${separator}sslmode=require`;
    }
  }
  
  // Determine if SSL should be enabled (Supabase always requires SSL)
  const isSupabase = url.includes("supabase") || url.includes("pooler.supabase.com");
  const sslConfig = isSupabase 
    ? { rejectUnauthorized: false } // Supabase uses self-signed certs - don't reject
    : undefined;
  
  const pool = new Pool({ 
    connectionString,
    ssl: sslConfig,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// Avoid creating new clients on hot reload in dev
// Clear cache if DATABASE_URL changes (for SSL config updates)
const currentDbUrl = process.env.DATABASE_URL;
if (global.__prisma && global.__prisma_db_url !== currentDbUrl) {
  // Database URL changed - clear cache to force reconnection with new SSL config
  global.__prisma = undefined;
  global.__prisma_db_url = undefined;
}

export const prisma = global.__prisma ?? makePrisma();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
  global.__prisma_db_url = currentDbUrl;
}
