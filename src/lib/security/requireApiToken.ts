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

  // Log token usage (audit)
  const url = req instanceof NextRequest ? req.nextUrl.pathname : new URL(req.url).pathname;
  await logTokenUsage(tokenRecord, url, options?.scopes || []);

  return tokenRecord;
}

/**
 * Log token usage to audit logs
 * IMPORTANT: Never log plaintext token or hash
 */
async function logTokenUsage(tokenRecord: ApiTokenRecord, path: string, checkedScopes: string[]): Promise<void> {
  try {
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
 * Helper to get actor from either Clerk session or API token
 * Used in routes that accept both authentication methods
 * @param requiredScopes - Optional scopes required for token auth (e.g., ["console:exec", "admin"])
 */
export async function getActorFromRequest(
  req: NextRequest | Request,
  options?: { requiredScopes?: string[] }
): Promise<{ id: string; email: string; roles: string[]; clerkId?: string }> {
  // Try API token first if enabled
  if (process.env.ADMIN_API_TOKEN_AUTH_ENABLED === "true") {
    const authHeader = req.headers.get("authorization");
    const bearerToken = parseBearer(authHeader);

    if (bearerToken) {
      try {
        const tokenRecord = await authenticateApiToken(bearerToken);
        // Require specified scopes or default to admin scope
        const scopes = options?.requiredScopes || ["admin"];
        requireScope(tokenRecord, scopes);
        return {
          id: tokenRecord.createdById,
          email: tokenRecord.createdBy.email,
          roles: ["ADMIN"], // Synthetic admin role for token-based auth
        };
      } catch (error) {
        // If token auth fails, fall through to Clerk auth
        // (This allows routes to support both methods)
      }
    }
  }

  // Fall back to Clerk session (requireAdmin)
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

