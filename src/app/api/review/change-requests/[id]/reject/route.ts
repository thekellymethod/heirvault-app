// src/app/api/review/change-requests/[id]/reject/route.ts
import { NextResponse } from "next/server";
;
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { ChangeRequestStatus, UploaderType } from "@/lib/db/enums";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason } = await req.json().catch(() => ({}));
  const { id } = await ctx.params;

  const { update: updateChangeRequest, findUnique: findUniqueChangeRequest } = await import("@/lib/db");
  
  type ChangeRequestRecord = {
    id: string;
    clientId: string;
  };
  
  // First get the change request to get clientId
  const existingCr = await findUniqueChangeRequest<ChangeRequestRecord>("change_requests", { id });
  if (!existingCr) {
    return NextResponse.json({ error: "Change request not found" }, { status: 404 });
  }

  await updateChangeRequest("change_requests", { id }, {
    status: ChangeRequestStatus.REJECTED,
    updatedAt: new Date().toISOString(),
  });

  await auditLog({
    actorType: user.roles.includes("ADMIN") ? UploaderType.SYSTEM : UploaderType.ATTORNEY,
    actorId: user.id,
    clientId: existingCr.clientId,
    inviteId: null,
    action: "CHANGE_REQUEST_REJECTED",
    metadata: { changeRequestId: existingCr.id, reason: typeof reason === "string" ? reason.slice(0, 300) : null },
  });

  return NextResponse.json({ ok: true });
}

