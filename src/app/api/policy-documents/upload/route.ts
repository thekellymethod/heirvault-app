import { auditLog } from "@/lib/audit";
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, HttpError, auditActorTypeFromPrincipal } from "@/lib/permissions/guard";
import { rethrowAsRouteHttpError } from "@/lib/permissions/routeErrors";
import { resolveCanonicalPolicyDocumentUploadIds } from "@/lib/storage/policyDocumentAccess";
import { uploadPolicyDocument } from "@/lib/storage/policyDocuments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Multipart fields `firmId`, `estateId`, `policyId` are **candidate** identifiers only.
 * Storage path and DB row use UUIDs re-read from `policies` / `clients` after graph checks.
 *
 * **estateId** = `clients.id` (estate in product language, client row in the schema).
 */

export async function POST(req: Request) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();
    const form = await req.formData();

    const firmId = String(form.get("firmId") ?? "").trim();
    const estateId = String(form.get("estateId") ?? "").trim();
    const policyId = String(form.get("policyId") ?? "").trim();
    const type = String(form.get("type") ?? "policy-document").trim();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new HttpError(400, "file is required (multipart field: file)");
    }

    const canonical = await resolveCanonicalPolicyDocumentUploadIds({ firmId, estateId, policyId });

    try {
      const row = await uploadPolicyDocument({
        firmId: canonical.firmId,
        estateId: canonical.estateId,
        policyId: canonical.policyId,
        type,
        fileName: file.name,
        body: file,
        mimeType: file.type || null,
        uploadedBy: principal.dbUserId,
      });

      const issuedAt = new Date().toISOString();
      await auditLog({
        actorType: auditActorTypeFromPrincipal(principal),
        actorId: principal.dbUserId,
        clientId: canonical.estateId,
        action: "POLICY_DOCUMENT_UPLOAD",
        metadata: {
          documentId: row.id,
          firmId: canonical.firmId,
          policyId: canonical.policyId,
          filePath: row.file_path,
          fileName: row.file_name,
          mimeType: row.mime_type,
          sizeBytes: row.size_bytes,
          issuedAt,
        },
      }).catch(() => {});

      return { ok: true as const, document: row };
    } catch (e) {
      rethrowAsRouteHttpError(e);
    }
  });
}
