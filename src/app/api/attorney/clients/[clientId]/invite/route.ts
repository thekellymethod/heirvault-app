// src/app/api/attorney/clients/[clientId]/invite/route.ts
import { NextResponse } from "next/server";
;
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { generateInviteToken, hashToken } from "@/lib/invites";
import { auditLog } from "@/lib/audit";
import { nowPlusHours } from "@/lib/security";
import { putObject } from "@/lib/storage";
import { makeInvitePdf } from "@/lib/pdf/invite";
import { sendEmail } from "@/lib/email";
import { ClientInviteStatus } from "@/lib/db/enums";
import crypto from "crypto";

function shortInviteCodeFromToken(token: string) {
  // A short human code (NOT the hash, not DB IDs)
  // This is for display only; token remains in the link/QR.
  return token.slice(0, 4).toUpperCase() + "-" + token.slice(4, 8).toUpperCase();
}

export async function POST(_: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const params = await ctx.params;
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = params.clientId;

  // Note: Explicit ownership check recommended for production (currently relies on requireVerifiedAttorney)
  const { findUnique: findUniqueClient, create: createDb, update: updateDb } = await import("@/lib/db");
  const client = await findUniqueClient("clients", { id: clientId });
  if (!client || !(client as any).email) return NextResponse.json({ error: "Client not found or missing email" }, { status: 404 });

  const ttl = Number(process.env.INVITE_TOKEN_TTL_HOURS ?? "72");
  const maxSubs = Number(process.env.INVITE_MAX_SUBMISSIONS ?? "2");

  const token = generateInviteToken();
  const tokenHash = hashToken(token);
  const inviteCode = shortInviteCodeFromToken(token);

  const inviteId = crypto.randomUUID();
  const invite = await createDb("client_invites", {
    id: inviteId,
    clientId,
    token, // Store plaintext temporarily for email
    tokenHash,
    email: (client as any).email,
    status: "PENDING", // ClientInviteStatus.PENDING
    expiresAt: nowPlusHours(ttl).toISOString(),
    maxSubmissions: maxSubs,
    submissionCount: 0,
    invitedByUserId: user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any) as any;

  await auditLog({
    actorType: "ATTORNEY",
    actorId: user.id,
    clientId,
    inviteId: invite.id,
    action: "INVITE_CREATED",
    metadata: { expiresAt: invite.expiresAt, maxSubmissions: maxSubs },
  });

  const uploadUrl = `${process.env.APP_URL || "http://localhost:3000"}/upload?token=${encodeURIComponent(token)}`;

  const pdfBuf = await makeInvitePdf({
    clientName: `${(client as any).firstName ?? ""} ${(client as any).lastName ?? ""}`.trim() || "Policyholder",
    attorneyName: `${(user as any).firstName ?? ""} ${(user as any).lastName ?? ""}`.trim() || "Attorney",
    inviteCode,
    uploadUrl,
    requiresTax: false,
  });

  const artifactKey = `private/artifacts/${clientId}/${invite.id}-invite.pdf`;
  const { sha256: _sha256 } = await putObject({ key: artifactKey, body: pdfBuf, contentType: "application/pdf" });

  const artifactId = crypto.randomUUID();
  const artifact = await createDb("artifacts", {
    id: artifactId,
    type: "INVITE_PDF",
    clientId: clientId,
    inviteId: invite.id,
    fileName: `HeirVault-Invite-${invite.id}.pdf`,
    filePath: artifactKey,
    fileSize: pdfBuf.length,
    mimeType: "application/pdf",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any) as any;

  await updateDb("client_invites", { id: invite.id }, {
    invitePdfArtifactId: artifact.id,
    updatedAt: new Date().toISOString(),
  } as any);

  await auditLog({
    actorType: "SYSTEM",
    actorId: null,
    clientId,
    inviteId: invite.id,
    action: "INVITE_PDF_STORED",
    metadata: { artifactType: "INVITE_PDF" },
  });

  await sendEmail({
    to: (client as any).email,
    subject: "Secure Upload Invitation",
    html: `
      <p>Your secure upload invite is ready.</p>
      <p><b>Invite Code:</b> ${inviteCode}</p>
      <p>Use the secure link or scan the QR code in the attached PDF.</p>
      <p><a href="${uploadUrl}">Open secure upload</a></p>
    `,
    attachments: [{ filename: "HeirVault-Upload-Invite.pdf", content: pdfBuf }],
  });

  await auditLog({
    actorType: "SYSTEM",
    actorId: null,
    clientId,
    inviteId: invite.id,
    action: "INVITE_EMAIL_SENT",
      metadata: { to: (client as any).email },
  });

  // Return only attorney-facing safe response
  return NextResponse.json({ ok: true, inviteId: invite.id, status: invite.status });
}
