import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// In Prisma 7+, PrismaClient automatically reads from DATABASE_URL environment variable
// Must pass at least an empty object {} or options to the constructor
function createPrismaClient(): PrismaClient {
  const options: { accelerateUrl?: string; log?: string[] } = {};

  const accelerateUrl = process.env.PRISMA_ACCELERATE_URL?.trim();
  
  // Only use Accelerate URL if it's valid (starts with prisma:// or prisma+postgres://)
  if (accelerateUrl && (accelerateUrl.startsWith("prisma://") || accelerateUrl.startsWith("prisma+postgres://"))) {
    options.accelerateUrl = accelerateUrl;
  } else if (accelerateUrl) {
    // Invalid format - log warning but don't use it
    console.warn(
      `[Prisma] PRISMA_ACCELERATE_URL is set but invalid format. ` +
      `Expected format: prisma://... or prisma+postgres://... ` +
      `Got: ${accelerateUrl.substring(0, 50)}...`
    );
  }

  if (!options.accelerateUrl && !process.env.DATABASE_URL) {
    throw new Error(
      "Missing database connection. Set DATABASE_URL or valid PRISMA_ACCELERATE_URL."
    );
  }

  // Always include log option to ensure non-empty options object
  options.log = process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

  return new PrismaClient(options);
}

export const prisma =
  global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
