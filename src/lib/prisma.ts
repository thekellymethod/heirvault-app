import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const pooledUrl = process.env.DATABASE_URL; // 6543 pooler

export const prisma =
  global.prisma ??
  new PrismaClient({
    datasources: pooledUrl
      ? { db: { url: pooledUrl } }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
