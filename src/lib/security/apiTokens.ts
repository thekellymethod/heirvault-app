import "server-only";
import { createHash, randomBytes } from "crypto";
// Prisma removed - database access needs to be implemented
import { HttpError } from "@/lib/auth/guards";

export type ApiTokenRecord = {
  id: string,
  name: string,
  hash: string,
  scopes: string[];
  createdById: string,
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  lastUsedPath: string | null;
  createdBy: {
    id: string,
    email: string,
  };
};

export type TokenGenerationResult = {
  token: string,
  hash: string,
  prefix: string,
  publicId: string,
};

/**
 * Generate a new API token with format: hv_<env>_<publicId>_<secret>
 * - env: "test" or "live" based on environment
 * - publicId: 8 hex characters
 * - secret: base64url 24 bytes
 */
export function generateApiToken(): TokenGenerationResult {
  const envPart = getEnvPrefix();
  const publicId = randomBytes(4).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const token = `hv_${envPart}_${publicId}_${secret}`;
  const hash = createHash("sha256").update(token).digest("hex");

  return {
    token,
    hash,
    prefix: `hv_${envPart}_`,
    publicId,
  };
}

/**
 * Get environment prefix for tokens
 * - "auto" => "test" in dev, "live" in production
 * - "live" or "test" => use that value
 */
function getEnvPrefix(): "test" | "live" {
  const prefixEnv = process.env.API_TOKEN_PREFIX_ENV;
  if (prefixEnv === "live") return "live";
  if (prefixEnv === "test") return "test";
  // auto mode: production => live, else => test
  return process.env.NODE_ENV === "production" ? "live" : "test";
}

/**
 * Create an API token and store it in the database
 * Returns the plaintext token ONCE - caller must store it securely
 */
export async function createApiToken(input: {
  actorUserId: string,
  name: string,
  scopes: string[];
  expiresInDays?: number;
  expiresAt?: Date;
}): Promise<{ token: string, record: ApiTokenRecord }> {
  const { token, hash } = generateApiToken();
  const expiresAt = input.expiresAt ?? (input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000) : null);

  const { create: createDb, findUnique: findUniqueUser } = await import("@/lib/db");
  const { randomUUID } = await import("crypto");
  
  // Create the API token
  const tokenId = randomUUID();
  await createDb("api_tokens", {
    id: tokenId,
    name: input.name,
    hash,
    scopes: input.scopes,
    createdById: input.actorUserId,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // Fetch the created token with user info
  const tokenRecord = await findUniqueUser("api_tokens", { id: tokenId }) as any;
  const createdBy = await findUniqueUser("users", { id: input.actorUserId }) as any;
  
  const record = {
    ...tokenRecord,
    createdBy: {
      id: createdBy.id,
      email: createdBy.email,
    },
  };

  return {
    token,
    record: {
      id: record.id,
      name: record.name,
      hash: record.hash,
      scopes: record.scopes,
      createdById: record.createdById,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      lastUsedAt: record.lastUsedAt,
      lastUsedIp: record.lastUsedIp,
      lastUsedPath: record.lastUsedPath,
      createdBy: {
        id: record.createdBy.id,
        email: record.createdBy.email,
      },
    },
  };
}

/**
 * Authenticate a bearer token
 * Returns the token record with createdBy user info
 * Throws HttpError if token is invalid, revoked, or expired
 */
export async function authenticateApiToken(bearerToken: string): Promise<ApiTokenRecord> {
  if (!bearerToken || !bearerToken.startsWith("hv_")) {
    throw new HttpError(401, "Invalid token format");
  }

  const hash = createHash("sha256").update(bearerToken).digest("hex");

  const { findMany: findManyTokens, findUnique: findUniqueUser } = await import("@/lib/db");
  
  // Find token by hash
  const tokens = await findManyTokens("api_tokens", {
    where: { hash },
    limit: 1,
  });

  if (!tokens || tokens.length === 0) {
    throw new HttpError(401, "Invalid token");
  }

  const tokenRecord = tokens[0] as any;
  
  // Fetch the user who created the token
  const createdBy = await findUniqueUser("users", { id: tokenRecord.createdById }) as any;
  
  const record = {
    ...tokenRecord,
    createdBy: {
      id: createdBy.id,
      email: createdBy.email,
    },
  };

  if (!record) {
    throw new HttpError(401, "Invalid token");
  }

  if (record.revokedAt) {
    throw new HttpError(401, "Token has been revoked");
  }

  if (record.expiresAt && record.expiresAt < new Date()) {
    throw new HttpError(401, "Token has expired");
  }

  return {
    id: record.id,
    name: record.name,
    hash: record.hash,
    scopes: record.scopes,
    createdById: record.createdById,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
    lastUsedAt: record.lastUsedAt,
    lastUsedIp: record.lastUsedIp,
    lastUsedPath: record.lastUsedPath,
    createdBy: {
      id: record.createdBy.id,
      email: record.createdBy.email,
    },
  };
}

/**
 * Check if token has required scope(s)
 * Throws HttpError 403 if scope check fails
 */
export function requireScope(record: ApiTokenRecord, requiredScope: string | string[]): void {
  const scopes = Array.isArray(requiredScope) ? requiredScope : [requiredScope];
  const hasScope = scopes.some((scope) => record.scopes.includes(scope) || record.scopes.includes("admin"));

  if (!hasScope) {
    throw new HttpError(403, `Missing required scope: ${scopes.join(" or ")}`);
  }
}

/**
 * Parse Bearer token from Authorization header
 * Returns token string or null
 */
export function parseBearer(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

