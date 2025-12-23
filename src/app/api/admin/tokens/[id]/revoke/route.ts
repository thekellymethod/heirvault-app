import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/admin/tokens/[id]/revoke
 * Revoke a token by setting revokedAt=now
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
      user_id: actor.id,
      action: "API_TOKEN_REVOKED",
      message: `API token revoked: tokenId=${id}, name=${token.name}`,
      created_at: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}

