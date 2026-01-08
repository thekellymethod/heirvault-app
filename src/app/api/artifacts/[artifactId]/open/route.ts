// src/app/api/artifacts/[artifactId]/open/route.ts
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, requireRole, requireClientAccess, HttpError } from "@/lib/permissions/guard";
;
import { UserRole } from "@/lib/db/enums";
import { UploaderType } from "@/lib/db/enums";
import { signGetUrl } from "@/lib/storage";
import { auditLog } from "@/lib/audit";

export async function GET(_: Request, ctx: { params: Promise<{ artifactId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    // Check if user is admin via roles array, or has attorney role
    if (!principal.roles.includes("ADMIN") && principal.role !== UserRole.attorney) {
      throw new HttpError(403, "Forbidden");
    }

    const { artifactId } = await ctx.params;

    const { findUnique: findUniqueArtifact, findUnique: findUniqueClient } = await import("@/lib/db");
    
    type ArtifactRecord = {
      id: string;
      clientId: string | null;
      inviteId: string | null;
      filePath: string;
      fileName: string | null;
      type: string;
    };
    
    const artifact = await findUniqueArtifact<ArtifactRecord>("artifacts", { id: artifactId });

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
      actorType: principal.roles.includes("ADMIN") ? "ADMIN" : UploaderType.ATTORNEY,
      actorId: principal.dbUserId,
      clientId: artifact.clientId,
      inviteId: artifact.inviteId ?? null,
      action: "ARTIFACT_OPENED",
      metadata: { artifactId: artifact.id, type: artifact.type },
    });

    return { ok: true, url };
  });
}

