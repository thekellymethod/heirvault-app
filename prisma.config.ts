import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local first, then .env as fallback
config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "");
const directUrl = process.env.DIRECT_URL?.trim().replace(/^["']|["']$/g, "");

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Check .env.local or Vercel env vars.");
}
if (!directUrl) {
  throw new Error("DIRECT_URL is not set. Check .env.local or Vercel env vars.");
}

if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
  throw new Error("DATABASE_URL must start with postgresql:// or postgres://");
}

if (!directUrl.startsWith("postgresql://") && !directUrl.startsWith("postgres://")) {
  throw new Error("DIRECT_URL must start with postgresql:// or postgres://");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: databaseUrl,           // runtime (Vercel): transaction pooler 6543
    shadowDatabaseUrl: directUrl, // migrations: session pooler 5432
  },
});
