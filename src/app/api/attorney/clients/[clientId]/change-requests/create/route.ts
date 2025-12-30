// src/app/api/attorney/clients/[clientId]/change-requests/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthPrincipal, requireRole } from "@/lib/permissions/guard";
import { getOrgContext } from "@/lib/org/getOrgContext";
import { requireRegistryActive } from "@/lib/billing/requireRegistryActive";
import { UserRole } from "@prisma/client";
import { generateInviteToken, hashToken } from "@/lib/invites";
import { nowPlusHours } from "@/lib/security";
import { auditLog } from "@/lib/audit";
import { ChangeRequestStatus, ChangeRequestType, UploaderType } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { makeInvitePdf } from "@/lib/pdf/invite";
import crypto from "crypto";

function labelRequestType(t: ChangeRequestType) {
  switch (t) {
    case ChangeRequestType.POLICY_UPDATE: return "Policy Update";
    case ChangeRequestType.BENEFICIARY_UPDATE: return "Beneficiary Update";
    case ChangeRequestType.ID_UPDATE: return "Identity Update";
    case ChangeRequestType.TAX_UPDATE: return "Tax Update";
    case ChangeRequestType.ADDRESS_UPDATE: return "Address Update";
    default: return "Change Request";
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const principal = await requireAuthPrincipal();
  requireRole(principal, [UserRole.ADMIN, UserRole.ATTORNEY]);
  
  // Unified registry gate
  const { org } = await getOrgContext(principal);
  await requireRegistryActive(org);

  const { clientId } = await ctx.params;
  const { requestType, note } = await req.json().catch(() => ({}));

  const client = await prisma.clients.findUnique({ where: { id: clientId } });
  if (!client?.email) return NextResponse.json({ error: "Client not found or missing email" }, { status: 404 });

  const ttl = Number(process.env.CHANGE_REQUEST_TTL_HOURS ?? "72");
  const maxSubs = Number(process.env.CHANGE_REQUEST_MAX_SUBMISSIONS ?? "2");

  const token = generateInviteToken();
  const tokenHash = hashToken(token);

  const cr = await prisma.change_requests.create({
    data: {
      id: crypto.randomUUID(),
      clientId,
      tokenHash,
      requestType: (requestType as ChangeRequestType) ?? ChangeRequestType.OTHER,
      note: typeof note === "string" ? note.slice(0, 500) : null,
      expiresAt: nowPlusHours(ttl),
      maxSubmissions: maxSubs,
      status: ChangeRequestStatus.OPEN,
    },
  });

  await auditLog({
    actorType: UploaderType.ATTORNEY,
    actorId: principal.clerkUserId,
    clientId,
    inviteId: null,
    action: "CHANGE_REQUEST_CREATED",
    metadata: { changeRequestId: cr.id, requestType: cr.requestType },
  });

  const uploadUrl = `${process.env.APP_URL || "http://localhost:3000"}/upload?changeToken=${encodeURIComponent(token)}`;

  // Reuse Invite PDF generator but use request type language
  const pdfBuf = await makeInvitePdf({
    clientName: `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Policyholder",
    attorneyName: "Attorney", // Simplified for now
    inviteCode: "CHANGE-REQ",
    uploadUrl,
    requiresTax: cr.requestType === ChangeRequestType.TAX_UPDATE,
  });

  await sendEmail({
    to: client.email,
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
    metadata: { changeRequestId: cr.id, to: client.email },
  });

  return NextResponse.json({ ok: true, changeRequestId: cr.id });
}

