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
  });

  // Fetch the created token with user info
  type ApiTokenDbRecord = {
    id: string;
    name: string;
    hash: string;
    scopes: string[];
    createdById: string;
    createdAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
    lastUsedAt: string | null;
    lastUsedIp: string | null;
    lastUsedPath: string | null;
  };
  
  type UserDbRecord = {
    id: string;
    email: string;
  };
  
  const tokenRecord = await findUniqueUser<ApiTokenDbRecord>("api_tokens", { id: tokenId });
  const createdBy = await findUniqueUser<UserDbRecord>("users", { id: input.actorUserId });
  
  if (!tokenRecord || !createdBy) {
    throw new Error("Failed to create or fetch API token");
  }

  // Convert date strings to Date objects for the return type
  const parseDate = (dateStr: string | null): Date | null => {
    return dateStr ? new Date(dateStr) : null;
  };

  return {
    token,
    record: {
      id: tokenRecord.id,
      name: tokenRecord.name,
      hash: tokenRecord.hash,
      scopes: tokenRecord.scopes,
      createdById: tokenRecord.createdById,
      createdAt: new Date(tokenRecord.createdAt),
      expiresAt: parseDate(tokenRecord.expiresAt),
      revokedAt: parseDate(tokenRecord.revokedAt),
      lastUsedAt: parseDate(tokenRecord.lastUsedAt),
      lastUsedIp: tokenRecord.lastUsedIp,
      lastUsedPath: tokenRecord.lastUsedPath,
      createdBy: {
        id: createdBy.id,
        email: createdBy.email,
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

  type ApiTokenDbRecord = {
    id: string;
    name: string;
    hash: string;
    scopes: string[];
    createdById: string;
    createdAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
    lastUsedAt: string | null;
    lastUsedIp: string | null;
    lastUsedPath: string | null;
  };
  
  type UserDbRecord = {
    id: string;
    email: string;
  };
  
  const tokenRecord = tokens[0] as ApiTokenDbRecord;
  
  if (!tokenRecord) {
    throw new HttpError(401, "Invalid token");
  }
  
  // Fetch the user who created the token
  const createdBy = await findUniqueUser<UserDbRecord>("users", { id: tokenRecord.createdById });
  
  if (!createdBy) {
    throw new HttpError(401, "Token creator not found");
  }

  // Parse dates from strings
  const parseDate = (dateStr: string | null): Date | null => {
    return dateStr ? new Date(dateStr) : null;
  };

  const revokedAt = parseDate(tokenRecord.revokedAt);
  const expiresAt = parseDate(tokenRecord.expiresAt);

  if (revokedAt) {
    throw new HttpError(401, "Token has been revoked");
  }

  if (expiresAt && expiresAt < new Date()) {
    throw new HttpError(401, "Token has expired");
  }

  return {
    id: tokenRecord.id,
    name: tokenRecord.name,
    hash: tokenRecord.hash,
    scopes: tokenRecord.scopes,
    createdById: tokenRecord.createdById,
    createdAt: new Date(tokenRecord.createdAt),
    expiresAt,
    revokedAt,
    lastUsedAt: parseDate(tokenRecord.lastUsedAt),
    lastUsedIp: tokenRecord.lastUsedIp,
    lastUsedPath: tokenRecord.lastUsedPath,
    createdBy: {
      id: createdBy.id,
      email: createdBy.email,
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

