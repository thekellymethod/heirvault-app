/**
 * Input Sanitization Utilities
 * Prevents XSS attacks and code injection
 */

/**
 * Sanitize string input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return "";
  
  return input
    .replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers (onclick, onerror, etc.)
    .replace(/&#x?[0-9a-f]+;/gi, "") // Remove HTML entities
    .trim();
}

/**
 * Sanitize string but allow basic formatting
 * Keeps safe characters but removes dangerous ones
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  
  // Allow alphanumeric, spaces, basic punctuation, but remove dangerous chars
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

/**
 * Sanitize SQL input to prevent SQL injection
 * Escapes single quotes and removes dangerous SQL keywords
 */
export function sanitizeSql(input: string | null | undefined): string {
  if (!input) return "";
  
  // Escape single quotes (PostgreSQL style)
  let sanitized = input.replace(/'/g, "''");
  
  // Remove or escape dangerous SQL patterns
  const dangerousPatterns = [
    /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)/gi,
    /--/g, // SQL comments
    /\/\*/g, // SQL block comments
    /\*\//g,
    /xp_/gi, // SQL Server extended procedures
    /sp_/gi, // SQL Server stored procedures
  ];
  
  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "");
  });
  
  return sanitized.trim();
}

/**
 * Sanitize for LIKE queries (adds % wildcards safely)
 */
export function sanitizeLike(input: string | null | undefined): string {
  if (!input) return "";
  
  // First sanitize SQL
  let sanitized = sanitizeSql(input);
  
  // Escape LIKE wildcards
  sanitized = sanitized.replace(/%/g, "\\%").replace(/_/g, "\\_");
  
  return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = sanitizeString(input).toLowerCase();
  
  if (!emailRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, "");
  
  // Validate US phone number format (10 or 11 digits)
  if (digits.length < 10 || digits.length > 11) {
    return null;
  }
  
  return digits;
}

/**
 * Sanitize file name to prevent path traversal
 */
export function sanitizeFileName(input: string | null | undefined): string {
  if (!input) return "";
  
  return input
    .replace(/[<>:"|?*\x00-\x1f]/g, "") // Remove dangerous characters
    .replace(/\.\./g, "") // Remove path traversal attempts
    .replace(/^\.+/, "") // Remove leading dots
    .trim();
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 */
export function sanitizeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  
  const sanitized = sanitizeString(input);
  
  // Block dangerous protocols
  const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
  const lower = sanitized.toLowerCase();
  
  for (const protocol of dangerousProtocols) {
    if (lower.startsWith(protocol)) {
      return null;
    }
  }
  
  // Only allow http, https, mailto
  if (!/^(https?|mailto):/i.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Sanitize JSON input (validates it's valid JSON and sanitizes string values)
 */
export function sanitizeJson<T>(input: string | null | undefined): T | null {
  if (!input) return null;
  
  try {
    const parsed = JSON.parse(input) as T;
    
    // Recursively sanitize string values
    if (typeof parsed === "object" && parsed !== null) {
      return sanitizeObject(parsed) as T;
    }
    
    if (typeof parsed === "string") {
      return sanitizeString(parsed) as T;
    }
    
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === "object" && obj !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate input length
 */
export function validateLength(
  input: string,
  min: number,
  max: number
): boolean {
  const length = input.length;
  return length >= min && length <= max;
}

/**
 * Validate input against regex pattern
 */
export function validatePattern(input: string, pattern: RegExp): boolean {
  return pattern.test(input);
}
