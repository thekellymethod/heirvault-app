import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { eq, and, or, inArray, sql, desc, asc, like, ilike } from "drizzle-orm";

// Configure pool with SSL for Prisma/cloud databases
const connectionConfig: any = {
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 30000, // 30 second timeout
};

// Enable SSL for Prisma and other cloud databases
if (process.env.DATABASE_URL?.includes('prisma.io') || process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('supabase.co')) {
  connectionConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(connectionConfig);

// Create Drizzle instance
export const db = drizzle(pool, { schema });

// Export schema for use in queries
export * from "./schema";

// Export enums for compatibility
export * from "./enums";

// Export common query helpers
export { eq, and, or, inArray, sql, desc, asc, like, ilike };

// Prisma compatibility layer for raw SQL queries
// This allows existing code using prisma.$queryRawUnsafe and prisma.$queryRaw to continue working
export const prisma = {
  /**
   * Execute raw SQL query with unsafe string interpolation
   * Supports parameterized queries with $1, $2, etc.
   */
  async $queryRawUnsafe<T = unknown>(query: string, ...params: unknown[]): Promise<T> {
    // Use the pool directly for parameterized queries ($1, $2, etc.)
    // This matches Prisma's behavior for $queryRawUnsafe
    const result = await pool.query(query, params);
    return result.rows as T;
  },

  /**
   * Execute raw SQL query with template literal (safer)
   * Supports template literal syntax like: sql`SELECT * FROM users WHERE id = ${id}`
   */
  async $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T> {
    // Drizzle's sql template handles this natively
    const result = await db.execute(sql(query, ...values));
    return result.rows as T;
  },

  /**
   * Execute raw SQL without returning results (for INSERT, UPDATE, DELETE)
   */
  async $executeRawUnsafe(query: string, ...params: unknown[]): Promise<number> {
    const result = await pool.query(query, params);
    return result.rowCount || 0;
  },

  /**
   * Execute raw SQL with template literal (for INSERT, UPDATE, DELETE)
   */
  async $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number> {
    const result = await db.execute(sql(query, ...values));
    return result.rowCount || 0;
  },
};

