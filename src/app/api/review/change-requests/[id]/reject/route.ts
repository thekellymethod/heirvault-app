// src/app/api/review/change-requests/[id]/reject/route.ts
import { NextResponse } from "next/server";
;
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { ChangeRequestStatus, UploaderType } from "@prisma/client";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason } = await req.json().catch(() => ({}));
  const { id } = await ctx.params;

  const cr = await prisma.change_requests.update({
    where: { id },
    data: { status: ChangeRequestStatus.REJECTED },
  });

  await auditLog({
    actorType: user.roles.includes("ADMIN") ? UploaderType.ADMIN : UploaderType.ATTORNEY,
    actorId: user.id,
    clientId: cr.clientId,
    inviteId: null,
    action: "CHANGE_REQUEST_REJECTED",
    metadata: { changeRequestId: cr.id, reason: typeof reason === "string" ? reason.slice(0, 300) : null },
  });

  return NextResponse.json({ ok: true });
}

