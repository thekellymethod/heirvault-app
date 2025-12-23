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

  // Create new token with same scopes and name (with " (rotated)" suffix)
  const { token, record: newToken } = await createApiToken({
    actorUserId: actor.id,
    name: `${oldToken.name} (rotated)`,
    scopes: oldToken.scopes,
    expiresAt: oldToken.expiresAt, // Copy expiry from old token
  });

  // Audit log
  await prisma.audit_logs.create({
    data: {
      id: crypto.randomUUID(),
      user_id: actor.id,
      action: "API_TOKEN_ROTATED",
      message: `API token rotated: oldTokenId=${id}, newTokenId=${newToken.id}, name=${oldToken.name}`,
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
    },
  });
}

