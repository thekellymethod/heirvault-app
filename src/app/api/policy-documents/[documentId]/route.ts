import { z } from "zod";
import type { NextRequest } from "next/server";
import { auditLog } from "@/lib/audit";
import { withRouteGuard } from "@/lib/permissions/route";
import { requireAuthPrincipal, HttpError, auditActorTypeFromPrincipal } from "@/lib/permissions/guard";
import { rethrowAsRouteHttpError } from "@/lib/permissions/routeErrors";
import { loadPolicyDocumentForAccess } from "@/lib/storage/policyDocumentAccess";
import { deletePolicyDocument } from "@/lib/storage/policyDocuments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ documentId: string }> }) {
  return withRouteGuard(async () => {
    const principal = await requireAuthPrincipal();

    const { documentId } = await ctx.params;
    z.string().uuid().parse(documentId);

    const firmIdRaw = req.nextUrl.searchParams.get("firmId")?.trim() ?? "";
    if (!firmIdRaw) {
      throw new HttpError(400, "firmId query parameter is required");
    }
    const firmId = z.string().uuid().parse(firmIdRaw);

    try {
      const row = await loadPolicyDocumentForAccess(documentId, firmId);
      await deletePolicyDocument(documentId);

      const issuedAt = new Date().toISOString();
      await auditLog({
        actorType: auditActorTypeFromPrincipal(principal),
        actorId: principal.dbUserId,
        clientId: row.estate_id,
        action: "POLICY_DOCUMENT_DELETE",
        metadata: {
          documentId: row.id,
          firmId: row.firm_id,
          policyId: row.policy_id,
          filePath: row.file_path,
          issuedAt,
        },
      }).catch(() => {});

      return { ok: true as const };
    } catch (e) {
      rethrowAsRouteHttpError(e);
    }
  });
}
