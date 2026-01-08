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
 * Check if a table exists (for debugging)
 */
export async function tableExists(table: string): Promise<boolean> {
  try {
    // Try to query the table with a limit 0 to check if it exists
    const { error } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true })
      .limit(0);
    
    // If error is about table not existing, return false
    if (error) {
      const errorMessage = String(error.message || error).toLowerCase();
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('42P01')) {
        return false;
      }
      // Other errors might mean table exists but there's a different issue
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate data before inserting into users table
 */
function validateUserData(data: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!data.id || typeof data.id !== 'string') {
    errors.push('id is required and must be a string (UUID)');
  }
  
  if (!data.clerkId || typeof data.clerkId !== 'string') {
    errors.push('clerkId is required and must be a string');
  }
  
  if (!data.email || typeof data.email !== 'string') {
    errors.push('email is required and must be a string');
  } else {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('email must be a valid email address');
    }
  }
  
  // Roles validation
  if (data.roles !== undefined) {
    if (!Array.isArray(data.roles)) {
      errors.push('roles must be an array');
    } else {
      // Validate each role is a string
      const invalidRoles = data.roles.filter(r => typeof r !== 'string');
      if (invalidRoles.length > 0) {
        errors.push(`roles array contains non-string values: ${JSON.stringify(invalidRoles)}`);
      }
    }
  }
  
  // Validate UUID format for id
  if (data.id && typeof data.id === 'string') {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.id)) {
      errors.push(`id must be a valid UUID format, got: ${data.id}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper for create operations
 */
export async function create<T>(table: string, data: Partial<T>): Promise<T> {
  // Ensure id is included if provided (for tables that require explicit IDs)
  const insertData = { ...data };
  
  // For users table, validate and prepare data
  if (table === "users") {
    const userData = insertData as Record<string, unknown>;
    
    // Validate required fields
    const validation = validateUserData(userData);
    if (!validation.valid) {
      const errorMessage = `[DB] User data validation failed: ${validation.errors.join(', ')}`;
      console.error(errorMessage);
      console.error(`[DB] Invalid user data:`, JSON.stringify(userData, null, 2));
      throw new Error(errorMessage);
    }
    
    // Ensure roles is properly formatted as an array
    if (userData.roles && Array.isArray(userData.roles)) {
      // Filter out any null/undefined values and ensure all are strings
      userData.roles = userData.roles.filter((r): r is string => typeof r === 'string');
      console.log(`[DB] Creating user with id: ${userData.id}, email: ${userData.email}, roles: ${JSON.stringify(userData.roles)}`);
    } else if (userData.roles === undefined || userData.roles === null) {
      // Default to empty array if roles is not provided
      userData.roles = [];
      console.log(`[DB] Creating user with id: ${userData.id}, email: ${userData.email}, roles: [] (default)`);
    }
    
    // Remove any undefined values to avoid issues with Supabase
    Object.keys(userData).forEach(key => {
      if (userData[key] === undefined) {
        delete userData[key];
      }
    });
    
    // ALWAYS ensure createdAt and updatedAt are set (required by database)
    // Database uses snake_case: created_at and updated_at
    // Force set these values to ensure they're never null or undefined
    const now = new Date().toISOString();
    
    // Check if values exist and are valid (not null, not undefined, not empty string)
    const hasCreatedAt = userData.created_at && userData.created_at !== null && userData.created_at !== '';
    const hasCreatedAtCamel = userData.createdAt && userData.createdAt !== null && userData.createdAt !== '';
    const hasUpdatedAt = userData.updated_at && userData.updated_at !== null && userData.updated_at !== '';
    const hasUpdatedAtCamel = userData.updatedAt && userData.updatedAt !== null && userData.updatedAt !== '';
    
    // Always set snake_case versions
    userData.created_at = hasCreatedAt ? userData.created_at : (hasCreatedAtCamel ? userData.createdAt : now);
    userData.updated_at = hasUpdatedAt ? userData.updated_at : (hasUpdatedAtCamel ? userData.updatedAt : now);
    
    // Remove camelCase versions to avoid confusion
    delete userData.createdAt;
    delete userData.updatedAt;
    
    // Log to verify values are set
    console.log(`[DB] User data before insert - created_at: ${userData.created_at}, updated_at: ${userData.updated_at}`);
    
    // Verify table exists (only log, don't fail)
    const exists = await tableExists(table);
    if (!exists) {
      console.warn(`[DB] Warning: Table ${table} may not exist. This might cause an error.`);
    }
  }
  
  const { data: result, error } = await supabaseAdmin
    .from(table)
    .insert(insertData as Record<string, unknown>)
    .select()
    .single();

  if (error) {
    // Log the error for debugging - extract all error properties
    // Supabase errors have specific properties we need to extract
    const errorDetails: Record<string, unknown> = {};
    
    // Extract standard Supabase error properties
    if (error && typeof error === 'object') {
      errorDetails.message = (error as any).message || String(error);
      errorDetails.code = (error as any).code;
      errorDetails.details = (error as any).details;
      errorDetails.hint = (error as any).hint;
      
      // Try to get all enumerable properties
      for (const key in error) {
        if (error.hasOwnProperty(key)) {
          errorDetails[key] = (error as any)[key];
        }
      }
    } else {
      errorDetails.error = String(error);
    }
    
    console.error(`[DB] Create error on table ${table}:`, JSON.stringify(errorDetails, null, 2));
    console.error(`[DB] Error type:`, typeof error);
    console.error(`[DB] Error constructor:`, error?.constructor?.name);
    console.error(`[DB] Insert data was:`, JSON.stringify(insertData, null, 2));
    
    // Also try to stringify the error directly
    try {
      console.error(`[DB] Error stringified:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (e) {
      console.error(`[DB] Could not stringify error:`, e);
    }
    
    // Create a more descriptive error message
    const errorMessage = errorDetails.message || errorDetails.error || 'Unknown database error';
    const errorCode = errorDetails.code || 'UNKNOWN';
    const enhancedError = new Error(
      `Failed to create record in ${table}: ${errorMessage} (code: ${errorCode})`
    ) as Error & { code?: string; details?: unknown; hint?: string };
    enhancedError.code = errorCode as string;
    enhancedError.details = errorDetails.details;
    enhancedError.hint = errorDetails.hint as string;
    
    throw enhancedError;
  }
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
  // Supabase pattern: update() first, then chain filters
  let query = supabaseAdmin
    .from(table)
    .update(data as Record<string, unknown>)
    .select();

  // Apply where filters after update
  // Type assertion needed because Supabase types don't properly reflect the chaining
  for (const [key, value] of Object.entries(where)) {
    query = (query as any).eq(key, value);
  }

  const { data: result, error } = await query.single();

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
