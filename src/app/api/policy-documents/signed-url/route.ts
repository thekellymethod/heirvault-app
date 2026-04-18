import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, HttpError, auditActorTypeFromPrincipal } from "@/lib/permissions/guard";
import { rethrowAsRouteHttpError } from "@/lib/permissions/routeErrors";
import { loadPolicyDocumentForAccess } from "@/lib/storage/policyDocumentAccess";
import { createPolicyDocumentSignedUrl } from "@/lib/storage/policyDocuments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  documentId: z.string().uuid(),
  firmId: z.string().uuid(),
  expiresInSeconds: z.number().int().min(60).max(60 * 60 * 24 * 7).optional(),
});

export async function POST(req: Request) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();

    const raw = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ") || "Invalid body";
      throw new HttpError(400, msg);
    }

    try {
      const row = await loadPolicyDocumentForAccess(parsed.data.documentId, parsed.data.firmId);
      const { signedUrl, expiresInSeconds } = await createPolicyDocumentSignedUrl({
        filePath: row.file_path,
        expiresInSeconds: parsed.data.expiresInSeconds,
      });

      const issuedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
      await auditLog({
        actorType: principal.roles.includes("ADMIN") ? "ADMIN" : "ATTORNEY",
        actorId: principal.dbUserId,
        clientId: row.estate_id,
        action: "POLICY_DOCUMENT_SIGNED_URL_ISSUED",
        metadata: {
          documentId: row.id,
          firmId: row.firm_id,
          policyId: row.policy_id,
          expiresInSeconds,
          issuedAt,
          expiresAt,
        },
      }).catch(() => {});

      return { ok: true as const, signedUrl, filePath: row.file_path, expiresInSeconds, issuedAt, expiresAt };
    } catch (e) {
      rethrowAsRouteHttpError(e);
    }
  });
}
