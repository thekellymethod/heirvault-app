// src/app/api/attorney/clients/[clientId]/invite/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { generateInviteToken, hashToken } from "@/lib/invites";
import { auditLog } from "@/lib/audit";
import { nowPlusHours } from "@/lib/security";
import { putObject } from "@/lib/storage";
import { makeInvitePdf } from "@/lib/pdf/invite";
import { sendEmail } from "@/lib/email";
import { ClientInviteStatus, ArtifactType } from "@prisma/client";
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

  // TODO: enforce attorney role + ownership check
  const client = await prisma.clients.findUnique({ where: { id: clientId } });
  if (!client?.email) return NextResponse.json({ error: "Client not found or missing email" }, { status: 404 });

  const ttl = Number(process.env.INVITE_TOKEN_TTL_HOURS ?? "72");
  const maxSubs = Number(process.env.INVITE_MAX_SUBMISSIONS ?? "2");

  const token = generateInviteToken();
  const tokenHash = hashToken(token);
  const inviteCode = shortInviteCodeFromToken(token);

  const invite = await prisma.client_invites.create({
    data: {
      id: crypto.randomUUID(),
      clientId,
      token, // Store plaintext temporarily for email
      tokenHash,
      email: client.email,
      status: ClientInviteStatus.ACTIVE,
      expiresAt: nowPlusHours(ttl),
      maxSubmissions: maxSubs,
      submissionCount: 0,
      invitedByUserId: user.id,
    },
  });

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
    clientName: `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Policyholder",
    attorneyName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Attorney",
    inviteCode,
    uploadUrl,
    requiresTax: false,
  });

  const artifactKey = `private/artifacts/${clientId}/${invite.id}-invite.pdf`;
  const { sha256 } = await putObject({ key: artifactKey, body: pdfBuf, contentType: "application/pdf" });

  const artifact = await prisma.artifacts.create({
    data: {
      id: crypto.randomUUID(),
      type: ArtifactType.INVITE_PDF,
      clientId: clientId,
      inviteId: invite.id,
      fileName: `HeirVault-Invite-${invite.id}.pdf`,
      filePath: artifactKey,
      fileSize: pdfBuf.length,
      mimeType: "application/pdf",
    },
  });

  await prisma.client_invites.update({
    where: { id: invite.id },
    data: { invitePdfArtifactId: artifact.id },
  });

  await auditLog({
    actorType: "SYSTEM",
    actorId: null,
    clientId,
    inviteId: invite.id,
    action: "INVITE_PDF_STORED",
    metadata: { artifactType: "INVITE_PDF" },
  });

  await sendEmail({
    to: client.email,
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
    metadata: { to: client.email },
  });

  // Return only attorney-facing safe response
  return NextResponse.json({ ok: true, inviteId: invite.id, status: invite.status });
}
