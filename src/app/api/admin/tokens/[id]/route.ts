import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";

export const runtime = "nodejs";

/**
 * GET /api/admin/tokens/[id]
 * Get token metadata (no hash)
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const _actor = await requireAdmin();
  const { id } = await params;

  const { findUnique: findUniqueToken, findUnique: findUniqueUser } = await import("@/lib/db");
  
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
  
  const token = await findUniqueToken<ApiTokenRecord>("api_tokens", { id });

  if (!token) {
    return NextResponse.json({ ok: false, error: "Token not found" }, { status: 404 });
  }

  const user = await findUniqueUser<{ id: string; email: string }>("users", { id: token.createdByUserId });

  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      id: token.id,
      name: token.name,
      scopes: token.scopes,
      createdAt: typeof token.createdAt === 'string' ? token.createdAt : new Date(token.createdAt).toISOString(),
      expiresAt: token.expiresAt ? (typeof token.expiresAt === 'string' ? token.expiresAt : new Date(token.expiresAt).toISOString()) : null,
      revokedAt: token.revokedAt ? (typeof token.revokedAt === 'string' ? token.revokedAt : new Date(token.revokedAt).toISOString()) : null,
      lastUsedAt: token.lastUsedAt ? (typeof token.lastUsedAt === 'string' ? token.lastUsedAt : new Date(token.lastUsedAt).toISOString()) : null,
      lastUsedIp: token.lastUsedIp,
      lastUsedPath: token.lastUsedPath,
      createdBy: {
        id: user.id,
        email: user.email,
      },
    },
  });
}

/**
 * DELETE /api/admin/tokens/[id]
 * Revoke token (alias for POST /revoke)
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;

  const { findUnique: findUniqueToken, update: updateToken } = await import("@/lib/db");
  const { logAuditEvent } = await import("@/lib/audit");
  
  type ApiTokenRecord = {
    id: string;
    name: string;
    revokedAt: string | null;
  };
  
  const token = await findUniqueToken<ApiTokenRecord>("api_tokens", { id });

  if (!token) {
    return NextResponse.json({ ok: false, error: "Token not found" }, { status: 404 });
  }

  if (token.revokedAt) {
    return NextResponse.json({ ok: false, error: "Token already revoked" }, { status: 400 });
  }

  await updateToken("api_tokens", { id }, {
    revokedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>);

  // Audit log
  await logAuditEvent({
    userId: actor.id,
    action: "API_TOKEN_REVOKED",
    metadata: {
      tokenId: id,
      name: token.name,
    },
  });

  return NextResponse.json({ ok: true });
}

