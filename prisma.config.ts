import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Local dev convenience only. CI/Vercel supply env vars directly.
config({ path: ".env.local" });
config({ path: ".env" });

// Get DATABASE_URL from environment, with fallback for prisma generate (which doesn't need it)
const databaseUrl = process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: databaseUrl,
  },
});
