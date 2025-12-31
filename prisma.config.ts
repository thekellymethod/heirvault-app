import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first, then .env as fallback
// This populates process.env with DATABASE_URL
config({ path: ".env.local" });
config({ path: ".env" });

// Get DATABASE_URL from process.env (loaded by dotenv above)
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Please check your .env.local or .env file."
  );
}

// Fix common format issues
// Remove quotes if present
databaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, "");

// Check for the dot vs colon issue and fix it
if (databaseUrl.includes("postgres.pgpnbtmgloextjpmxxgv.99xZvLSJ")) {
  // Fix: replace dot with colon between username and password
  databaseUrl = databaseUrl.replace(
    "postgres.pgpnbtmgloextjpmxxgv.99xZvLSJ",
    "postgres.pgpnbtmgloextjpmxxgv:99xZvLSJ"
  );
  console.warn("⚠️  Fixed DATABASE_URL format: replaced dot with colon");
}

// Fix malformed hostname (missing dot before supabase.co)
if (databaseUrl.includes("pgpnbtmgloextjpmxxgvsupabase.co")) {
  databaseUrl = databaseUrl.replace(
    "pgpnbtmgloextjpmxxgvsupabase.co",
    "pgpnbtmgloextjpmxxgv.supabase.co"
  );
  console.warn("⚠️  Fixed hostname: added missing dot before supabase.co");
}

// Ensure we're using pooled connection (port 6543) for migrations, not direct (5432)
// If using direct connection format, suggest switching to pooled
if (databaseUrl.includes(":5432") && databaseUrl.includes("db.") && databaseUrl.includes(".supabase.co")) {
  console.warn("⚠️  Using direct connection (port 5432). For migrations, consider using pooled connection (port 6543)");
}

// Validate the URL format
if (!databaseUrl.startsWith("postgresql://")) {
  throw new Error(
    `Invalid DATABASE_URL format: must start with "postgresql://". Got: ${databaseUrl.substring(0, 20)}...`
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: databaseUrl,
  },
});
