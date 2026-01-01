/**
 * Rate Limiting Utilities
 * Prevents abuse and DoS attacks
 */

interface RateLimitStore {
  count: number;
  resetAt: number;
}

// In-memory store (for production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitStore>();

/**
 * Rate limit check
 * @param key - Unique identifier (IP, user ID, etc.)
 * @param max - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and reset time
 */
export function rateLimit(
  key: string,
  max: number = 100,
  windowMs: number = 60_000 // 1 minute default
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // Create new entry or reset expired entry
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    
    // Clean up old entries periodically
    if (rateLimitStore.size > 10000) {
      cleanupExpiredEntries(now);
    }
    
    return {
      allowed: true,
      remaining: max - 1,
      resetAt,
    };
  }

  if (entry.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: max - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get client IP from request
 */
export function getClientIp(req: Request | { headers: Headers }): string {
  const headers = req.headers instanceof Headers ? req.headers : new Headers();
  
  // Check various headers for IP (in order of preference)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  const cfConnectingIp = headers.get("cf-connecting-ip"); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return "unknown";
}

/**
 * Create rate limit key from request
 */
export function getRateLimitKey(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  const ip = getClientIp(req);
  return `ip:${ip}`;
}
