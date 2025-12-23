import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createApiToken } from "@/lib/security/apiTokens";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/admin/tokens
 * List all API tokens (no hash shown)
 */
export async function GET() {
  const actor = await requireAdmin();

  const tokens = await prisma.apiToken.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    data: tokens.map((token) => ({
      id: token.id,
      name: token.name,
      scopes: token.scopes,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
      lastUsedAt: token.lastUsedAt,
      lastUsedIp: token.lastUsedIp,
      lastUsedPath: token.lastUsedPath,
      createdBy: {
        id: token.createdBy.id,
        email: token.createdBy.email,
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

  let body: { name: string; scopes: string[]; expiresInDays?: number };
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
  await prisma.audit_logs.create({
    data: {
      id: crypto.randomUUID(),
      user_id: actor.id,
      action: "API_TOKEN_CREATED",
      message: `API token created: tokenId=${record.id}, name=${body.name}, scopes=${body.scopes.join(",")}`,
      created_at: new Date(),
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

