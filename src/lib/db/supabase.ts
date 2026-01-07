/**
 * Supabase Database Client
 * 
 * Provides Supabase client for database operations, replacing Prisma.
 * Uses service role key for admin operations that bypass RLS.
 */

import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Get Supabase admin client for database operations
 * This client bypasses RLS and should be used for server-side operations
 */
export function getDb() {
  return supabaseAdmin;
}

/**
 * Execute a raw SQL query
 * Use this for complex queries that can't be expressed with Supabase query builder
 */
export async function executeSql<T = unknown>(query: string, params?: unknown[]) {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    query,
    params: params || [],
  });

  if (error) throw error;
  return data as T;
}

/**
 * Helper to convert Supabase response to single result
 */
export function singleResult<T>(response: { data: T[] | null; error: unknown }): T | null {
  if (response.error) throw response.error;
  if (!response.data || response.data.length === 0) return null;
  return response.data[0];
}

/**
 * Helper to convert Supabase response to array result
 */
export function arrayResult<T>(response: { data: T[] | null; error: unknown }): T[] {
  if (response.error) throw response.error;
  return response.data || [];
}

/**
 * Helper for upsert operations
 * Note: Supabase upsert requires the conflict column to be a unique constraint
 */
export async function upsert<T>(
  table: string,
  data: Partial<T>,
  conflictColumn: string
): Promise<T> {
  // First try to find existing record
  const conflictValue = (data as Record<string, unknown>)[conflictColumn];
  const existing = await findUnique<T>(table, { [conflictColumn]: conflictValue });
  
  if (existing) {
    // Update existing
    return update<T>(table, { [conflictColumn]: conflictValue }, data);
  } else {
    // Create new
    return create<T>(table, data);
  }
}

/**
 * Helper for findUnique operations (by ID or unique field)
 */
export async function findUnique<T>(
  table: string,
  where: Record<string, unknown>
): Promise<T | null> {
  let query = supabaseAdmin.from(table).select("*");

  for (const [key, value] of Object.entries(where)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data as T;
}

/**
 * Helper for findMany operations
 */
export async function findMany<T>(
  table: string,
  options?: {
    where?: Record<string, unknown>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }
): Promise<T[]> {
  let query = supabaseAdmin.from(table).select("*");

  if (options?.where) {
    for (const [key, value] of Object.entries(options.where)) {
      query = query.eq(key, value);
    }
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true,
    });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as T[];
}

/**
 * Helper for create operations
 */
export async function create<T>(table: string, data: Partial<T>): Promise<T> {
  const { data: result, error } = await supabaseAdmin
    .from(table)
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result as T;
}

/**
 * Helper for update operations
 */
export async function update<T>(
  table: string,
  where: Record<string, unknown>,
  data: Partial<T>
): Promise<T> {
  let query = supabaseAdmin.from(table).update(data).select().single();

  for (const [key, value] of Object.entries(where)) {
    query = query.eq(key, value);
  }

  const { data: result, error } = await query;

  if (error) throw error;
  return result as T;
}

/**
 * Helper for delete operations
 */
export async function deleteRecord<T>(
  table: string,
  where: Record<string, unknown>
): Promise<T> {
  let query = supabaseAdmin.from(table).delete().select();

  for (const [key, value] of Object.entries(where)) {
    query = query.eq(key, value);
  }

  const { data: result, error } = await query.single();

  if (error) throw error;
  return result as T;
}

/**
 * Helper for count operations
 */
export async function count(
  table: string,
  where?: Record<string, unknown>
): Promise<number> {
  let query = supabaseAdmin.from(table).select("*", { count: "exact", head: true });

  if (where) {
    for (const [key, value] of Object.entries(where)) {
      if (value === null || value === undefined) {
        query = query.is(key, null);
      } else if (value && typeof value === 'object' && 'in' in value) {
        query = query.in(key, (value as any).in);
      } else {
        query = query.eq(key, value);
      }
    }
  }

  const { count: result, error } = await query;

  if (error) throw error;
  return result || 0;
}

/**
 * Helper for transaction-like operations
 * Note: Supabase doesn't support transactions in the same way as Prisma.
 * For complex transactions, use Postgres functions or handle manually.
 */
export async function transaction<T>(
  callback: (tx: typeof supabaseAdmin) => Promise<T>
): Promise<T> {
  // Supabase doesn't have built-in transactions, so we just execute the callback
  // For true transactions, you'd need to use Postgres functions
  return callback(supabaseAdmin);
}

/**
 * Execute raw SQL query using RPC
 * Note: Requires a Postgres function to be created in Supabase
 */
export async function queryRaw<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  // For raw SQL, we need to use Supabase's RPC or create a function
  // This is a placeholder - actual implementation depends on your setup
  const { data, error } = await supabaseAdmin.rpc('exec_raw_sql', {
    sql_query: sql,
    sql_params: params || [],
  });

  if (error) throw error;
  return (data || []) as T[];
}
