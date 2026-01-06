// src/app/api/review/change-requests/[id]/approve/route.ts
import { NextResponse } from "next/server";
;
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { ChangeRequestStatus, UploaderType } from "@prisma/client";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const cr = await prisma.change_requests.update({
    where: { id },
    data: { status: ChangeRequestStatus.APPROVED },
  });

  await auditLog({
    actorType: user.roles.includes("ADMIN") ? UploaderType.ADMIN : UploaderType.ATTORNEY,
    actorId: user.id,
    clientId: cr.clientId,
    inviteId: null,
    action: "CHANGE_REQUEST_APPROVED",
    metadata: { changeRequestId: cr.id },
  });

  return NextResponse.json({ ok: true });
}

