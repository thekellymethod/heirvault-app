import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";

export const runtime = "nodejs";

/**
 * POST /api/admin/tokens/[id]/revoke
 * Revoke a token by setting revokedAt=now
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

