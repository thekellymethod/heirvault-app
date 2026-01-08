// src/app/api/attorney/clients/[clientId]/invite/send/route.ts
// import { NextResponse } from "next/server";
;
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole, requireClientAccess } from "@/lib/permissions/guard";
import { UserRole } from "@/lib/db/enums";
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
    // Check if user is admin via roles array, or has attorney role
    if (!principal.roles.includes("ADMIN") && principal.role !== UserRole.attorney) {
      const { HttpError } = await import("@/lib/permissions/guard");
      throw new HttpError(403, "Forbidden");
    }
    
    // Unified registry gate
    const { org } = await getOrgContext(principal);
    // Convert currentPeriodEnd from string to Date if needed
    await requireRegistryActive({
      billingStatus: org.billingStatus,
      currentPeriodEnd: org.currentPeriodEnd 
        ? (typeof org.currentPeriodEnd === 'string' ? new Date(org.currentPeriodEnd) : org.currentPeriodEnd)
        : null,
    });
    
    const { clientId } = await ctx.params;
    await requireClientAccess({ principal, clientId });

    const { findUnique: findUniqueClient, findMany: findManyPolicies } = await import("@/lib/db");
    const client = await findUniqueClient("clients", { id: clientId });
    
    if (!client || !(client as any).email) {
      throw new Error("Client missing email");
    }

    // Fetch policies separately
    const policies = await findManyPolicies("policies", {
      where: { clientId },
      orderBy: { column: "createdAt", ascending: false },
      limit: 1,
    });
    
    const clientWithPolicies = {
      ...client,
      policies: policies || [],
    } as any;

    const ttl = Number(process.env.INVITE_TTL_HOURS ?? "72");
    const maxSubs = Number(process.env.INVITE_MAX_SUBMISSIONS ?? "2");

    // Always create a new invite (cannot recover raw token from hash)
    // This is the correct security posture: resend = new token
    const rawToken = generateInviteToken();
    const tokenHash = hashToken(rawToken);

    const { create: createDb, update: updateDb } = await import("@/lib/db");
    const inviteId = crypto.randomUUID();
    const invite = await createDb("client_invites", {
      id: inviteId,
      clientId: (clientWithPolicies as any).id,
      token: rawToken, // Store plaintext for initial lookup (can be cleared after first use)
      tokenHash,
      email: (clientWithPolicies as any).email,
      status: "PENDING", // ClientInviteStatus.PENDING
      expiresAt: nowPlusHours(ttl).toISOString(),
      maxSubmissions: maxSubs,
      submissionCount: 0,
      invitedByUserId: principal.dbUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any) as any;

    const uploadUrl = `${process.env.APP_URL || "http://localhost:3000"}/upload?token=${encodeURIComponent(rawToken)}`;

    const clientName = `${(clientWithPolicies as any).firstName ?? ""} ${(clientWithPolicies as any).lastName ?? ""}`.trim() || "Policyholder";
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
    const artifactKey = `private/artifacts/${(clientWithPolicies as any).id}/invite-${inviteId}-${receiptNumber}.pdf`;
    const { sha256: _sha256 } = await putObject({ key: artifactKey, body: pdfBuf, contentType: "application/pdf" });

    const artifactId = crypto.randomUUID();
    const artifact = await createDb("artifacts", {
      id: artifactId,
      type: "INVITE_PDF",
      clientId: (clientWithPolicies as any).id,
      inviteId: inviteId,
      fileName: `HeirVault-Secure-Upload-${inviteCode}.pdf`,
      filePath: artifactKey,
      fileSize: pdfBuf.length,
      mimeType: "application/pdf",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any) as any;

    // Link artifact to invite
    await updateDb("client_invites", { id: inviteId }, {
      invitePdfArtifactId: artifactId,
      updatedAt: new Date().toISOString(),
    } as any);

    await sendEmail({
      to: (clientWithPolicies as any).email,
      subject: "Secure Upload Link",
      html: `
        <p>A secure upload link has been created for your records.</p>
        <p><a href="${uploadUrl}">Open secure upload</a></p>
        <p>This link expires and is limited in submissions for security.</p>
      `,
      attachments: [{ filename: `HeirVault-Secure-Upload-${inviteCode}.pdf`, content: pdfBuf }],
    });

    const { UploaderType } = await import("@/lib/db/enums");
    await auditLog({
      actorType: principal.roles.includes("ADMIN") ? UploaderType.SYSTEM : UploaderType.ATTORNEY,
      actorId: principal.dbUserId,
      clientId: (clientWithPolicies as any).id,
      inviteId: inviteId,
      action: "INVITE_SENT",
      metadata: { to: (clientWithPolicies as any).email, artifactId: artifactId, inviteCode },
    });

    return { ok: true, inviteId: inviteId };
  });
}

