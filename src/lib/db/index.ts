import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { eq, and, or, inArray, sql, desc, asc } from "drizzle-orm";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // 10 second timeout
  // Note: query_timeout and statement_timeout are PostgreSQL connection string parameters
  // They should be set in the DATABASE_URL if needed, not here
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

// Export schema for use in queries
export * from "./schema";

// Export enums for compatibility
export * from "./enums";

// Export common query helpers
export { eq, and, or, inArray, sql, desc, asc };

