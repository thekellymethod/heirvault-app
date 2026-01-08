// src/app/api/attorney/clients/[clientId]/change-requests/create/route.ts
import { NextResponse } from "next/server";
;
import { requireAuthPrincipal } from "@/lib/permissions/guard";
import { getOrgContext } from "@/lib/org/getOrgContext";
import { requireRegistryActive } from "@/lib/billing/requireRegistryActive";
import { UserRole } from "@/lib/db/enums";
import { generateInviteToken, hashToken } from "@/lib/invites";
import { nowPlusHours } from "@/lib/security";
import { auditLog } from "@/lib/audit";
import { ChangeRequestStatus, ChangeRequestType, UploaderType } from "@/lib/db/enums";
import { sendEmail } from "@/lib/email";
import { makeInvitePdf } from "@/lib/pdf/invite";
import crypto from "crypto";

function labelRequestType(t: string) {
  switch (t) {
    case ChangeRequestType.UPDATE_POLICY: return "Policy Update";
    case ChangeRequestType.UPDATE_BENEFICIARY: return "Beneficiary Update";
    case ChangeRequestType.UPDATE_CLIENT_INFO: return "Identity Update";
    default: return "Change Request";
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const principal = await requireAuthPrincipal();
  // Check if user is admin via roles array, or has attorney role
  if (!principal.roles.includes("ADMIN") && principal.role !== UserRole.attorney) {
    const { HttpError } = await import("@/lib/permissions/guard");
    throw new HttpError(403, "Forbidden");
  }
  
  // Unified registry gate
  const { org } = await getOrgContext(principal);
  // Convert currentPeriodEnd from string to Date if needed
  const orgForBilling = {
    billingStatus: (org as any).billingStatus,
    currentPeriodEnd: (org as any).currentPeriodEnd 
      ? (typeof (org as any).currentPeriodEnd === 'string' 
          ? new Date((org as any).currentPeriodEnd) 
          : (org as any).currentPeriodEnd)
      : null,
  };
  await requireRegistryActive(orgForBilling);

  const { clientId } = await ctx.params;
  const { requestType, note } = await req.json().catch(() => ({}));

  const { findUnique: findUniqueClient, create: createDb } = await import("@/lib/db");
  const client = await findUniqueClient("clients", { id: clientId });
  if (!client || !(client as any).email) return NextResponse.json({ error: "Client not found or missing email" }, { status: 404 });

  const ttl = Number(process.env.CHANGE_REQUEST_TTL_HOURS ?? "72");
  const maxSubs = Number(process.env.CHANGE_REQUEST_MAX_SUBMISSIONS ?? "2");

  const token = generateInviteToken();
  const tokenHash = hashToken(token);

  const changeRequestId = crypto.randomUUID();
  const cr = await createDb("change_requests", {
    id: changeRequestId,
    clientId,
    tokenHash,
    requestType: (requestType as string) ?? ChangeRequestType.UPDATE_CLIENT_INFO,
    note: typeof note === "string" ? note.slice(0, 500) : null,
    expiresAt: nowPlusHours(ttl).toISOString(),
    maxSubmissions: maxSubs,
    status: ChangeRequestStatus.SUBMITTED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any) as any;

  await auditLog({
    actorType: "ATTORNEY",
    actorId: principal.dbUserId,
    clientId,
    inviteId: null,
    action: "CHANGE_REQUEST_CREATED",
    metadata: { changeRequestId: cr.id, requestType: cr.requestType },
  });

  const uploadUrl = `${process.env.APP_URL || "http://localhost:3000"}/upload?changeToken=${encodeURIComponent(token)}`;

  // Reuse Invite PDF generator but use request type language
  const pdfBuf = await makeInvitePdf({
    clientName: `${(client as any).firstName ?? ""} ${(client as any).lastName ?? ""}`.trim() || "Policyholder",
    attorneyName: "Attorney", // Simplified for now
    inviteCode: "CHANGE-REQ",
    uploadUrl,
    requiresTax: false, // Can be enhanced later
  });

  await sendEmail({
    to: (client as any).email,
    subject: `Secure Change Request: ${labelRequestType(cr.requestType)}`,
    html: `
      <p>A secure change request has been created.</p>
      <p><b>Request Type:</b> ${labelRequestType(cr.requestType)}</p>
      <p>Use the secure link below to upload updated documents and submit.</p>
      <p><a href="${uploadUrl}">Open secure change request upload</a></p>
    `,
    attachments: [{ filename: "HeirVault-Change-Request.pdf", content: pdfBuf }],
  });

  await auditLog({
    actorType: UploaderType.SYSTEM,
    actorId: null,
    clientId,
    inviteId: null,
    action: "CHANGE_REQUEST_EMAIL_SENT",
    metadata: { changeRequestId: cr.id, to: (client as any).email },
  });

  return NextResponse.json({ ok: true, changeRequestId: cr.id });
}

