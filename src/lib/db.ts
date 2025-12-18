import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Create PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// PrismaClient configuration
const prismaClientOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  adapter,
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
};

// If using Prisma Accelerate, use accelerateUrl instead of adapter
if (process.env.PRISMA_ACCELERATE_URL) {
  delete prismaClientOptions.adapter;
  prismaClientOptions.accelerateUrl = process.env.PRISMA_ACCELERATE_URL;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
