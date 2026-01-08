import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createApiToken } from "@/lib/security/apiTokens";

export const runtime = "nodejs";

/**
 * POST /api/admin/tokens/[id]/rotate
 * Rotate a token - creates a new token with same scopes/name
 * Old token remains active (not auto-revoked)
 * Returns plaintext token of the new token ONCE
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;

  const { findUnique: findUniqueToken } = await import("@/lib/db");
  const { logAuditEvent } = await import("@/lib/audit");
  
  type ApiTokenRecord = {
    id: string;
    name: string;
    scopes: string[];
    expiresAt: string | Date | null;
    revokedAt: string | Date | null;
  };
  
  const oldToken = await findUniqueToken<ApiTokenRecord>("api_tokens", { id });

  if (!oldToken) {
    return NextResponse.json({ ok: false, error: "Token not found" }, { status: 404 });
  }

  if (oldToken.revokedAt) {
    return NextResponse.json({ ok: false, error: "Cannot rotate revoked token" }, { status: 400 });
  }

  // Check if old token is expired
  const expiresAtDate = oldToken.expiresAt ? (typeof oldToken.expiresAt === 'string' ? new Date(oldToken.expiresAt) : oldToken.expiresAt) : null;
  const isExpired = expiresAtDate && expiresAtDate < new Date();
  
  // If expired, set new token expiry to undefined (no expiry) to prevent inheriting past date
  // Otherwise, copy the expiry from the old token (convert null to undefined)
  const newExpiresAt = isExpired ? undefined : (expiresAtDate ?? undefined);

  // Create new token with same scopes and name (with " (rotated)" suffix)
  const { token, record: newToken } = await createApiToken({
    actorUserId: actor.id,
    name: `${oldToken.name} (rotated)`,
    scopes: oldToken.scopes,
    expiresAt: newExpiresAt,
  });

  // Audit log
  await logAuditEvent({
    userId: actor.id,
    action: "API_TOKEN_ROTATED",
    metadata: {
      oldTokenId: id,
      newTokenId: newToken.id,
      name: oldToken.name,
      expired: isExpired,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      token, // Plaintext token - shown ONCE
      oldTokenId: id,
      newToken: {
        id: newToken.id,
        name: newToken.name,
        scopes: newToken.scopes,
        expiresAt: newToken.expiresAt,
      },
      warning: isExpired ? "Old token was expired. New token has no expiry." : undefined,
    },
  });
}

