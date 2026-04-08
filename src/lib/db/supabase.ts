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
 * Convert camelCase to snake_case for database column names
 * Examples: userId -> user_id, organizationId -> organization_id, firstName -> first_name
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Known camelCase columns that exist in the database (should NOT be converted)
 * These columns are camelCase in the database schema itself
 */
const CAMEL_CASE_COLUMNS: Record<string, string[]> = {
  users: ['clerkId'], // users.clerkId is camelCase in DB
  attorney_profiles: ['userId', 'licenseStatus', 'verifiedAt', 'appliedAt'], // These are camelCase
  api_tokens: ['createdById', 'createdAt', 'expiresAt', 'revokedAt', 'lastUsedAt', 'lastUsedIp', 'lastUsedPath'],
  audit_logs: ['createdAt'], // audit_logs.createdAt is camelCase
  documents: ['createdAt'], // documents.createdAt is camelCase
};

/** Last path segment, lowercased — matches CAMEL_CASE_COLUMNS keys even if caller passes `Users` or `public.users`. */
function tableKeyForRules(table: string): string {
  const part = table.trim().split(".").pop() ?? table.trim();
  return part.toLowerCase();
}

/**
 * DB column is quoted "clerkId". PostgREST must never see clerk_id on users (PGRST204).
 * Call after any key conversion as a safety net for filters and PATCH bodies.
 */
function normalizeUsersClerkIdKeys(row: Record<string, unknown>, table: string): Record<string, unknown> {
  if (tableKeyForRules(table) !== "users") return row;
  if (!Object.prototype.hasOwnProperty.call(row, "clerk_id")) return row;
  const { clerk_id, ...rest } = row;
  if (Object.prototype.hasOwnProperty.call(rest, "clerkId")) {
    return rest;
  }
  return { ...rest, clerkId: clerk_id };
}

/**
 * Convert a where clause object from camelCase to snake_case keys
 * This allows code to use camelCase while database uses snake_case
 * 
 * Special handling: Some tables have camelCase columns (like users.clerkId),
 * so we check if the column exists as camelCase before converting.
 */
function convertWhereToSnakeCase(where: Record<string, unknown>, table: string): Record<string, unknown> {
  const converted: Record<string, unknown> = {};
  const tk = tableKeyForRules(table);
  const knownCamelCase = CAMEL_CASE_COLUMNS[tk] || [];

  for (const [rawKey, value] of Object.entries(where)) {
    let key = rawKey;
    // Column in DB is "clerkId"; never send clerk_id (would hit the snake_case branch below and pass through wrongly if key were clerk_id from a spread)
    if (tk === "users" && key === "clerk_id") {
      key = "clerkId";
    }

    if (key.includes("_")) {
      converted[key] = value;
    } else if (knownCamelCase.includes(key)) {
      converted[key] = value;
    } else {
      const snakeKey = camelToSnake(key);
      if (tk === "users" && snakeKey === "clerk_id") {
        converted.clerkId = value;
      } else {
        converted[snakeKey] = value;
      }
    }
  }
  return converted;
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
 * Automatically converts camelCase keys to snake_case for database queries
 * (except for known camelCase columns like users.clerkId)
 */
export async function findUnique<T>(
  table: string,
  where: Record<string, unknown>
): Promise<T | null> {
  let query = supabaseAdmin.from(table).select("*");

  // Convert camelCase keys to snake_case for database columns
  // Pass table name to check for known camelCase columns
  let snakeWhere = convertWhereToSnakeCase(where, table);
  snakeWhere = normalizeUsersClerkIdKeys(snakeWhere, table);
  for (const [key, value] of Object.entries(snakeWhere)) {
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
 * Automatically converts camelCase keys to snake_case for database queries
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
    let snakeWhere = convertWhereToSnakeCase(options.where, table);
    snakeWhere = normalizeUsersClerkIdKeys(snakeWhere, table);
    for (const [key, value] of Object.entries(snakeWhere)) {
      query = query.eq(key, value);
    }
  }

  if (options?.orderBy) {
    // Convert column name to snake_case if needed
    const snakeColumn = options.orderBy.column.includes('_') 
      ? options.orderBy.column 
      : camelToSnake(options.orderBy.column);
    query = query.order(snakeColumn, {
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
 * Automatically converts camelCase keys to snake_case for database columns
 */
export async function create<T>(table: string, data: Partial<T>): Promise<T> {
  // Convert all camelCase keys to snake_case for database columns
  const insertData = { ...data } as Record<string, unknown>;
  const snakeInsertData: Record<string, unknown> = {};
  
  // For users table, validate and prepare data
  if (table === "users") {
    // Validate required fields
    const validation = validateUserData(insertData);
    if (!validation.valid) {
      const errorMessage = `[DB] User data validation failed: ${validation.errors.join(', ')}`;
      console.error(errorMessage);
      console.error(`[DB] Invalid user data:`, JSON.stringify(insertData, null, 2));
      throw new Error(errorMessage);
    }
    
    // Ensure roles is properly formatted as an array
    if (insertData.roles && Array.isArray(insertData.roles)) {
      // Filter out any null/undefined values and ensure all are strings
      insertData.roles = insertData.roles.filter((r): r is string => typeof r === 'string');
      console.log(`[DB] Creating user with id: ${insertData.id}, email: ${insertData.email}, roles: ${JSON.stringify(insertData.roles)}`);
    } else if (insertData.roles === undefined || insertData.roles === null) {
      // Default to empty array if roles is not provided
      insertData.roles = [];
      console.log(`[DB] Creating user with id: ${insertData.id}, email: ${insertData.email}, roles: [] (default)`);
    }
    
    // Remove any undefined values to avoid issues with Supabase
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined) {
        delete insertData[key];
      }
    });
    
    // ALWAYS ensure createdAt and updatedAt are set (required by database)
    // Database uses snake_case: created_at and updated_at
    const now = new Date().toISOString();
    
    // Check if values exist and are valid (not null, not undefined, not empty string)
    const hasCreatedAt = insertData.created_at && insertData.created_at !== null && insertData.created_at !== '';
    const hasCreatedAtCamel = insertData.createdAt && insertData.createdAt !== null && insertData.createdAt !== '';
    const hasUpdatedAt = insertData.updated_at && insertData.updated_at !== null && insertData.updated_at !== '';
    const hasUpdatedAtCamel = insertData.updatedAt && insertData.updatedAt !== null && insertData.updatedAt !== '';
    
    // Always set snake_case versions
    insertData.created_at = hasCreatedAt ? insertData.created_at : (hasCreatedAtCamel ? insertData.createdAt : now);
    insertData.updated_at = hasUpdatedAt ? insertData.updated_at : (hasUpdatedAtCamel ? insertData.updatedAt : now);
    
    // Remove camelCase versions to avoid confusion
    delete insertData.createdAt;
    delete insertData.updatedAt;
    
    // Log to verify values are set
    console.log(`[DB] User data before insert - created_at: ${insertData.created_at}, updated_at: ${insertData.updated_at}`);
    
    // Verify table exists (only log, don't fail)
    const exists = await tableExists(table);
    if (!exists) {
      console.warn(`[DB] Warning: Table ${table} may not exist. This might cause an error.`);
    }
  }
  
  // Convert all keys to snake_case, but preserve known camelCase columns
  const tkIns = tableKeyForRules(table);
  const knownCamelCase = CAMEL_CASE_COLUMNS[tkIns] || [];
  for (const [rawKey, value] of Object.entries(insertData)) {
    let key = rawKey;
    if (tkIns === "users" && key === "clerk_id") {
      key = "clerkId";
    }
    if (key.includes("_")) {
      snakeInsertData[key] = value;
    } else if (knownCamelCase.includes(key)) {
      snakeInsertData[key] = value;
    } else {
      const snakeKey = camelToSnake(key);
      snakeInsertData[tkIns === "users" && snakeKey === "clerk_id" ? "clerkId" : snakeKey] = value;
    }
  }

  const insertPayload = normalizeUsersClerkIdKeys(snakeInsertData, table);

  const { data: result, error } = await supabaseAdmin
    .from(table)
    .insert(insertPayload)
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
 * Automatically converts camelCase keys to snake_case for database queries
 */
export async function update<T>(
  table: string,
  where: Record<string, unknown>,
  data: Partial<T>
): Promise<T> {
  // Match create(): preserve known camelCase DB columns (e.g. users."clerkId")
  const updateData = { ...data } as Record<string, unknown>;
  const snakeUpdateData: Record<string, unknown> = {};
  const tk = tableKeyForRules(table);
  const knownCamelCase = CAMEL_CASE_COLUMNS[tk] || [];

  for (const [rawKey, value] of Object.entries(updateData)) {
    let key = rawKey;
    if (tk === "users" && key === "clerk_id") {
      key = "clerkId";
    }
    if (key.includes("_")) {
      snakeUpdateData[key] = value;
    } else if (knownCamelCase.includes(key)) {
      snakeUpdateData[key] = value;
    } else {
      const sk = camelToSnake(key);
      snakeUpdateData[tk === "users" && sk === "clerk_id" ? "clerkId" : sk] = value;
    }
  }

  const patch = normalizeUsersClerkIdKeys(snakeUpdateData, table);

  // Supabase pattern: update() first, then chain filters
  let query = supabaseAdmin.from(table).update(patch).select();

  let snakeWhere = convertWhereToSnakeCase(where, table);
  snakeWhere = normalizeUsersClerkIdKeys(snakeWhere, table);
  for (const [key, value] of Object.entries(snakeWhere)) {
    query = (query as any).eq(key, value);
  }

  const { data: result, error } = await query.single();

  if (error) throw error;
  return result as T;
}

/**
 * Helper for delete operations
 * Automatically converts camelCase keys to snake_case for database queries
 */
export async function deleteRecord<T>(
  table: string,
  where: Record<string, unknown>
): Promise<T> {
  let query = supabaseAdmin.from(table).delete().select();

  let snakeWhere = convertWhereToSnakeCase(where, table);
  snakeWhere = normalizeUsersClerkIdKeys(snakeWhere, table);
  for (const [key, value] of Object.entries(snakeWhere)) {
    query = query.eq(key, value);
  }

  const { data: result, error } = await query.single();

  if (error) throw error;
  return result as T;
}

/**
 * Helper for count operations
 * Automatically converts camelCase keys to snake_case for database queries
 */
export async function count(
  table: string,
  where?: Record<string, unknown>
): Promise<number> {
  let query = supabaseAdmin.from(table).select("*", { count: "exact", head: true });

  if (where) {
    // Convert where clause keys to snake_case
    // Pass table name to check for known camelCase columns
    let snakeWhere = convertWhereToSnakeCase(where, table);
    snakeWhere = normalizeUsersClerkIdKeys(snakeWhere, table);
    for (const [key, value] of Object.entries(snakeWhere)) {
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
 * Execute raw SQL via RPC `exec_raw_sql` (not created by default — add in SQL or avoid this helper).
 */
export async function queryRaw<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const { data, error } = await supabaseAdmin.rpc('exec_raw_sql', {
    sql_query: sql,
    sql_params: params || [],
  });

  if (error) throw error;
  return (data || []) as T[];
}
