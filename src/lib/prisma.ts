import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// In Prisma 7+, PrismaClient automatically reads from DATABASE_URL environment variable
// Must pass at least an empty object {} or options to the constructor
function createPrismaClient(): PrismaClient {
  const options: { accelerateUrl?: string; log?: string[] } = {};

  if (process.env.PRISMA_ACCELERATE_URL) {
    options.accelerateUrl = process.env.PRISMA_ACCELERATE_URL;
  } else if (!process.env.DATABASE_URL) {
    throw new Error(
      "Missing database connection. Set DATABASE_URL or PRISMA_ACCELERATE_URL."
    );
  }

  // Always include log option to ensure non-empty options object
  options.log = process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

  return new PrismaClient(options);
}

export const prisma =
  global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
