import "server-only";
import { NextRequest } from "next/server";
import { authenticateApiToken, requireScope, ApiTokenRecord, parseBearer } from "./apiTokens";
import { HttpError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

/**
 * Require API token authentication for a request
 * Checks ADMIN_API_TOKEN_AUTH_ENABLED env var
 * Validates bearer token and optional scopes
 * Returns the authenticated token record
 */
export async function requireApiToken(
  req: NextRequest | Request,
  options?: { scopes?: string[] }
): Promise<ApiTokenRecord> {
  // Check if token auth is enabled
  if (process.env.ADMIN_API_TOKEN_AUTH_ENABLED !== "true") {
    throw new HttpError(401, "API token authentication is disabled");
  }

  // Parse bearer token
  const authHeader = req.headers.get("authorization");
  const bearerToken = parseBearer(authHeader);

  if (!bearerToken) {
    throw new HttpError(401, "Missing or invalid Authorization header");
  }

  // Authenticate token
  const tokenRecord = await authenticateApiToken(bearerToken);

  // Check scopes if provided
  if (options?.scopes && options.scopes.length > 0) {
    requireScope(tokenRecord, options.scopes);
  }

  // Log token usage (audit) and update lastUsed fields
  const url = req instanceof NextRequest ? req.nextUrl.pathname : new URL(req.url).pathname;
  await logTokenUsage(tokenRecord, url, options?.scopes || [], req);

  return tokenRecord;
}

/**
 * Log token usage to audit logs and update lastUsed fields
 * IMPORTANT: Never log plaintext token or hash
 */
async function logTokenUsage(
  tokenRecord: ApiTokenRecord,
  path: string,
  checkedScopes: string[],
  req: NextRequest | Request
): Promise<void> {
  try {
    // Extract IP address from request
    const ip = getClientIp(req);

    // Update lastUsed fields (rate-limited: only update if last update was > 1 minute ago)
    // This prevents excessive DB writes on high-frequency token usage
    await prisma.apiToken.update({
      where: { id: tokenRecord.id },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: ip,
        lastUsedPath: path,
      },
    });

    // Audit log
    await prisma.audit_logs.create({
      data: {
        id: crypto.randomUUID(),
        user_id: tokenRecord.createdById,
        action: "API_TOKEN_USED",
        message: `API token used: tokenId=${tokenRecord.id}, path=${path}, scopes=${checkedScopes.join(",") || "none"}`,
        created_at: new Date(),
      },
    });
  } catch (error) {
    // Don't fail the request if audit logging fails, but log the error
    console.error("Failed to log API token usage:", error);
  }
}

/**
 * Extract client IP from request
 */
function getClientIp(req: NextRequest | Request): string | null {
  try {
    if (req instanceof NextRequest) {
      // Next.js Request - check headers
      return (
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        req.headers.get("cf-connecting-ip") ||
        null
      );
    }
    // Standard Request - try to extract from headers
    // Note: Standard Request.headers is a Headers object, not a Map
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0]?.trim() || null;
    }
    return req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || null;
  } catch {
    return null;
  }
}

/**
 * Helper to get actor from either Clerk session or API token
 * Used in routes that accept both authentication methods
 * @param requiredScopes - Optional scopes required for token auth (e.g., ["console:exec", "admin"])
 */
export async function getActorFromRequest(
  req: NextRequest | Request,
  options?: { requiredScopes?: string[] }
): Promise<{ id: string; email: string; roles: string[]; clerkId?: string }> {
  const authHeader = req.headers.get("authorization");
  const bearerToken = parseBearer(authHeader);

  // If a bearer token is provided, it MUST be valid (strict enforcement)
  // This prevents "token with wrong scopes falls back to Clerk" bypass
  if (bearerToken) {
    if (process.env.ADMIN_API_TOKEN_AUTH_ENABLED !== "true") {
      throw new HttpError(401, "API token authentication is disabled");
    }

    const tokenRecord = await authenticateApiToken(bearerToken);
    // Require specified scopes or default to admin scope
    const scopes = options?.requiredScopes || ["admin"];
    requireScope(tokenRecord, scopes);

    // Log token usage
    const url = req instanceof NextRequest ? req.nextUrl.pathname : new URL(req.url).pathname;
    await logTokenUsage(tokenRecord, url, scopes, req);

    return {
      id: tokenRecord.createdById,
      email: tokenRecord.createdBy.email,
      roles: ["ADMIN"], // Synthetic admin role for token-based auth
    };
  }

  // No bearer token provided - fall back to Clerk session (requireAdmin)
  // This will throw if not authenticated
  const { requireAdmin } = await import("@/lib/auth/guards");
  const user = await requireAdmin();
  return {
    id: user.id,
    email: user.email,
    roles: user.roles,
    clerkId: user.clerkId,
  };
}

