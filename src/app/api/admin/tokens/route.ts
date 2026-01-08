import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createApiToken } from "@/lib/security/apiTokens";

export const runtime = "nodejs";

/**
 * GET /api/admin/tokens
 * List all API tokens (no hash shown)
 */
export async function GET() {
  await requireAdmin(); // Authorization check

  const { findMany: findManyTokens, findUnique: findUniqueUser } = await import("@/lib/db");
  
  type ApiTokenRecord = {
    id: string;
    name: string;
    scopes: string[];
    createdAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
    lastUsedAt: string | null;
    lastUsedIp: string | null;
    lastUsedPath: string | null;
    createdByUserId: string;
  };
  
  const tokens = await findManyTokens<ApiTokenRecord>("api_tokens", {
    orderBy: { column: "createdAt", ascending: false },
  });

  // Fetch users for each token
  const tokensWithUsers = await Promise.all(
    (tokens || []).map(async (token) => {
      const user = await findUniqueUser<{ id: string; email: string }>("users", { id: token.createdByUserId });
      return {
        token,
        user: user || null,
      };
    })
  );

  return NextResponse.json({
    ok: true,
    data: tokensWithUsers
      .filter((twu) => twu.user !== null)
      .map((twu) => ({
        id: twu.token.id,
        name: twu.token.name,
        scopes: twu.token.scopes,
        createdAt: typeof twu.token.createdAt === 'string' ? twu.token.createdAt : new Date(twu.token.createdAt).toISOString(),
        expiresAt: twu.token.expiresAt ? (typeof twu.token.expiresAt === 'string' ? twu.token.expiresAt : new Date(twu.token.expiresAt).toISOString()) : null,
        revokedAt: twu.token.revokedAt ? (typeof twu.token.revokedAt === 'string' ? twu.token.revokedAt : new Date(twu.token.revokedAt).toISOString()) : null,
        lastUsedAt: twu.token.lastUsedAt ? (typeof twu.token.lastUsedAt === 'string' ? twu.token.lastUsedAt : new Date(twu.token.lastUsedAt).toISOString()) : null,
        lastUsedIp: twu.token.lastUsedIp,
        lastUsedPath: twu.token.lastUsedPath,
        createdBy: {
          id: twu.user!.id,
          email: twu.user!.email,
        },
      })),
  });
}

/**
 * POST /api/admin/tokens
 * Create a new API token
 * Body: { name: string, scopes: string[], expiresInDays?: number }
 * Returns: { token: plaintext (ONCE), id, name, scopes, expiresAt }
 */
export async function POST(req: Request) {
  const actor = await requireAdmin();

  let body: { name: string, scopes: string[]; expiresInDays?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  }

  if (!Array.isArray(body.scopes) || body.scopes.length === 0) {
    return NextResponse.json({ ok: false, error: "scopes must be a non-empty array" }, { status: 400 });
  }

  // Create token
  const { token, record } = await createApiToken({
    actorUserId: actor.id,
    name: body.name,
    scopes: body.scopes,
    expiresInDays: body.expiresInDays,
  });

  // Audit log
  const { create: createAudit, randomUUID } = await import("@/lib/db");
  const { randomUUID: cryptoRandomUUID } = await import("crypto");
  const { logAuditEvent } = await import("@/lib/audit");
  
  await logAuditEvent({
    userId: actor.id,
    action: "API_TOKEN_CREATED",
    metadata: {
      tokenId: record.id,
      name: body.name,
      scopes: body.scopes.join(","),
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      token, // Plaintext token - shown ONCE
      id: record.id,
      name: record.name,
      scopes: record.scopes,
      expiresAt: record.expiresAt,
    },
  });
}

