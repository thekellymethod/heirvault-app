// src/app/api/attorney/clients/[clientId]/invite/send/route.ts
// import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole, requireClientAccess } from "@/lib/permissions/guard";
import { UserRole, UploaderType, ArtifactType } from "@prisma/client";
import { generateInviteToken, hashToken } from "@/lib/invites";
import { nowPlusHours, makeReceiptNumber } from "@/lib/security";
import { makeInvitePdf } from "@/lib/pdf/invite";
import { putObject } from "@/lib/storage";
import { sendEmail } from "@/lib/email";
import { auditLog } from "@/lib/audit";
import { getOrgContext } from "@/lib/org/getOrgContext";
import { requireRegistryActive } from "@/lib/billing/requireRegistryActive";
import crypto from "crypto";

function shortInviteCodeFromToken(token: string): string {
  return token.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function POST(_: Request, ctx: { params: Promise<{ clientId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN, UserRole.attorney]);
    
    // Unified registry gate
    const { org } = await getOrgContext(principal);
    await requireRegistryActive(org);
    
    const { clientId } = await ctx.params;
    await requireClientAccess({ principal, clientId });

    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      include: {
        policies: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!client?.email) {
      throw new Error("Client missing email");
    }

    const ttl = Number(process.env.INVITE_TTL_HOURS ?? "72");
    const maxSubs = Number(process.env.INVITE_MAX_SUBMISSIONS ?? "2");

    // Always create a new invite (cannot recover raw token from hash)
    // This is the correct security posture: resend = new token
    const rawToken = generateInviteToken();
    const tokenHash = hashToken(rawToken);

    const invite = await prisma.client_invites.create({
      data: {
        id: crypto.randomUUID(),
        clientId: client.id,
        token: rawToken, // Store plaintext for initial lookup (can be cleared after first use)
        tokenHash,
        email: client.email,
        status: "ACTIVE", // ClientInviteStatus.ACTIVE
        expiresAt: nowPlusHours(ttl),
        maxSubmissions: maxSubs,
        submissionCount: 0,
        invitedByUserId: principal.dbUserId,
      },
    });

    const uploadUrl = `${process.env.APP_URL || "http://localhost:3000"}/upload?token=${encodeURIComponent(rawToken)}`;

    const clientName = `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Policyholder";
    // Note: Attorney name could be enhanced to use principal.firstName/lastName if stored
    const attorneyName = "Attorney";
    const inviteCode = shortInviteCodeFromToken(rawToken);
    const requiresTax = false; // Can derive from client/policy flags if needed

    const pdfBuf = await makeInvitePdf({
      clientName,
      attorneyName,
      inviteCode,
      uploadUrl,
      requiresTax,
    });

    // Store invite PDF as artifact
    const receiptNumber = makeReceiptNumber();
    const artifactKey = `private/artifacts/${client.id}/invite-${invite.id}-${receiptNumber}.pdf`;
    const { sha256: _sha256 } = await putObject({ key: artifactKey, body: pdfBuf, contentType: "application/pdf" });

    const artifact = await prisma.artifacts.create({
      data: {
        id: crypto.randomUUID(),
        type: ArtifactType.INVITE_PDF,
        clientId: client.id,
        inviteId: invite.id,
        fileName: `HeirVault-Secure-Upload-${inviteCode}.pdf`,
        filePath: artifactKey,
        fileSize: pdfBuf.length,
        mimeType: "application/pdf",
      },
    });

    // Link artifact to invite
    await prisma.client_invites.update({
      where: { id: invite.id },
      data: {
        invitePdfArtifactId: artifact.id,
      },
    });

    await sendEmail({
      to: client.email,
      subject: "Secure Upload Link",
      html: `
        <p>A secure upload link has been created for your records.</p>
        <p><a href="${uploadUrl}">Open secure upload</a></p>
        <p>This link expires and is limited in submissions for security.</p>
      `,
      attachments: [{ filename: `HeirVault-Secure-Upload-${inviteCode}.pdf`, content: pdfBuf }],
    });

    await auditLog({
      actorType: principal.role === UserRole.ADMIN ? UploaderType.ADMIN : UploaderType.ATTORNEY,
      actorId: principal.dbUserId,
      clientId: client.id,
      inviteId: invite.id,
      action: "INVITE_SENT",
      metadata: { to: client.email, artifactId: artifact.id, inviteCode },
    });

    return { ok: true, inviteId: invite.id };
  });
}

