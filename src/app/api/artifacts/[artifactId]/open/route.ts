// src/app/api/artifacts/[artifactId]/open/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole, requireClientAccess, HttpError } from "@/lib/permissions/guard";
;
import { UserRole, UploaderType } from "@prisma/client";
import { signGetUrl } from "@/lib/storage";
import { auditLog } from "@/lib/audit";

export async function GET(_: Request, ctx: { params: Promise<{ artifactId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    requireRole(principal, [UserRole.ADMIN, UserRole.attorney]);

    const { artifactId } = await ctx.params;

    const artifact = await prisma.artifacts.findUnique({
      where: { id: artifactId },
      include: { clients: true },
    });

    if (!artifact) throw new HttpError(404, "Not found");
    if (!artifact.clientId) throw new HttpError(400, "Artifact not linked to client");

    await requireClientAccess({
      principal,
      clientId: artifact.clientId,
      requireSensitive: true, // receipts contain client info by nature
      requireDownload: true, // treat opening artifacts as download-capable
    });

    const url = await signGetUrl({
      key: artifact.filePath,
      expiresInSeconds: 30,
      contentDisposition: "inline",
      fileName: artifact.fileName || "artifact.pdf",
    });

    await auditLog({
      actorType: principal.role === UserRole.ADMIN ? UploaderType.ADMIN : UploaderType.ATTORNEY,
      actorId: principal.dbUserId,
      clientId: artifact.clientId,
      inviteId: artifact.inviteId ?? null,
      action: "ARTIFACT_OPENED",
      metadata: { artifactId: artifact.id, type: artifact.type },
    });

    return { ok: true, url };
  });
}

