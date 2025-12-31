// src/app/api/billing/invoices/[artifactId]/open/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole, HttpError } from "@/lib/permissions/guard";
import { requireOrgAccess } from "@/lib/permissions/orgAccess";
import { prisma } from "@/lib/db";
import { UserRole, ArtifactType, UploaderType } from "@prisma/client";
import { signGetUrl } from "@/lib/storage";
import { auditLog } from "@/lib/audit";

export async function GET(_: Request, ctx: { params: Promise<{ artifactId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN, UserRole.ATTORNEY]);

    const { artifactId } = await ctx.params;

    const artifact = await prisma.artifacts.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) throw new HttpError(404, "Not found");
    if (artifact.type !== ArtifactType.BILLING_INVOICE_PDF) {
      throw new HttpError(400, "Not a billing invoice");
    }
    if (!artifact.orgId) {
      throw new HttpError(400, "Missing org binding");
    }

    await requireOrgAccess(principal, artifact.orgId);

    const storageKey = artifact.storageKey || artifact.filePath;
    if (!storageKey) {
      throw new HttpError(400, "Missing storage key");
    }

    const url = await signGetUrl({
      key: storageKey,
      expiresInSeconds: 30,
      contentDisposition: "inline",
      fileName: "invoice.pdf",
    });

    await auditLog({
      actorType: principal.role === UserRole.ADMIN ? UploaderType.ADMIN : UploaderType.ATTORNEY,
      actorId: principal.clerkUserId,
      clientId: null,
      inviteId: null,
      action: "BILLING_INVOICE_OPENED",
      metadata: { artifactId: artifact.id, orgId: artifact.orgId },
    });

    return { ok: true, url };
  });
}

