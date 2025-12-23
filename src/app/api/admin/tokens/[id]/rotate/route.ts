import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createApiToken } from "@/lib/security/apiTokens";
import { prisma } from "@/lib/prisma";

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

  const oldToken = await prisma.apiToken.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!oldToken) {
    return NextResponse.json({ ok: false, error: "Token not found" }, { status: 404 });
  }

  if (oldToken.revokedAt) {
    return NextResponse.json({ ok: false, error: "Cannot rotate revoked token" }, { status: 400 });
  }

  // Check if old token is expired
  const isExpired = oldToken.expiresAt && oldToken.expiresAt < new Date();
  
  // If expired, set new token expiry to null (no expiry) to prevent inheriting past date
  // Otherwise, copy the expiry from the old token
  const newExpiresAt = isExpired ? null : oldToken.expiresAt;

  // Create new token with same scopes and name (with " (rotated)" suffix)
  const { token, record: newToken } = await createApiToken({
    actorUserId: actor.id,
    name: `${oldToken.name} (rotated)`,
    scopes: oldToken.scopes,
    expiresAt: newExpiresAt,
  });

  // Audit log
  await prisma.audit_logs.create({
    data: {
      id: crypto.randomUUID(),
      user_id: actor.id,
      action: "API_TOKEN_ROTATED",
      message: `API token rotated: oldTokenId=${id}, newTokenId=${newToken.id}, name=${oldToken.name}${isExpired ? " (expired token, new token has no expiry)" : ""}`,
      created_at: new Date(),
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

