import { config as dotenv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load env for local dev only (Vercel/GitHub already inject env vars)
dotenv({ path: ".env.local" });
dotenv({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },

  // ✅ Prisma CLI uses THIS for migrate/db push/status
  datasource: {
    url: env("DATABASE_URL"),
  },
});
