// src/app/api/documents/[documentId]/preview/route.ts
import { NextResponse } from "next/server";
;
import { requireAuthPrincipal, requireRole, requireClientAccess, HttpError } from "@/lib/permissions/guard";
import { getSignedObjectUrl } from "@/lib/storage";
import { logDocumentAccess } from "@/lib/accessLog";
import { DocumentSensitivity, UploaderType, UserRole } from "@/lib/db/enums";

export async function GET(_: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const principal = await requireAuthPrincipal();
  requireRole(principal, [UserRole.attorney]);

  const { documentId } = await ctx.params;

  const { findUnique: findUniqueDoc } = await import("@/lib/db");
  
  type DocumentRecord = {
    id: string;
    clientId: string;
    filePath: string;
    sensitivityLevel: string;
  };
  
  const doc = await findUniqueDoc<DocumentRecord>("documents", { id: documentId });
  if (!doc) throw new HttpError(404, "Not found");

  await requireClientAccess({ principal, clientId: doc.clientId });

  const previewKey = doc.filePath;

  // For RESTRICTED, we DO NOT expose original here
  if (doc.sensitivityLevel === DocumentSensitivity.RESTRICTED) {
    // If you later generate redacted previews, switch previewKey here
    // For now: block preview if redacted version not available
    return NextResponse.json(
      { error: "Redacted preview required", requiresReasonedAccess: true },
      { status: 403 }
    );
  }

  const signedUrl = await getSignedObjectUrl(doc.filePath, 60);

  await logDocumentAccess({
    documentId: doc.id,
    actorType: principal.roles.includes("ADMIN") ? UploaderType.SYSTEM : UploaderType.ATTORNEY,
    actorId: principal.dbUserId,
    action: "VIEW_PREVIEW",
  });

  return NextResponse.json({ url: signedUrl });
}

