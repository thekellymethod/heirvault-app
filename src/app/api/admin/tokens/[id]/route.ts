import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/admin/tokens/[id]
 * Get token metadata (no hash)
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;

  const token = await prisma.apiToken.findUnique({
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

  if (!token) {
    return NextResponse.json({ ok: false, error: "Token not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    data: {
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

  const token = await prisma.apiToken.findUnique({
    where: { id },
  });

  if (!token) {
    return NextResponse.json({ ok: false, error: "Token not found" }, { status: 404 });
  }

  if (token.revokedAt) {
    return NextResponse.json({ ok: false, error: "Token already revoked" }, { status: 400 });
  }

  await prisma.apiToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  // Audit log
  await prisma.audit_logs.create({
    data: {
      id: crypto.randomUUID(),
      userId: actor.id,
      action: "API_TOKEN_REVOKED",
      message: `API token revoked: tokenId=${id}, name=${token.name}`,
      createdAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}

