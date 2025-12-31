import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Local dev convenience only. CI/Vercel supply env vars directly.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
