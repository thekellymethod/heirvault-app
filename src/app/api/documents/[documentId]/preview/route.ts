// src/app/api/documents/[documentId]/preview/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthPrincipal, requireRole, requireClientAccess, HttpError } from "@/lib/permissions/guard";
import { getSignedObjectUrl } from "@/lib/storage";
import { logDocumentAccess } from "@/lib/accessLog";
import { DocumentSensitivity, UploaderType, UserRole } from "@prisma/client";

export async function GET(_: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const principal = await requireAuthPrincipal();
  requireRole(principal, [UserRole.ADMIN, UserRole.attorney]);

  const { documentId } = await ctx.params;

  const doc = await prisma.documents.findUnique({
    where: { id: documentId },
    include: { clients: true },
  });
  if (!doc) throw new HttpError(404, "Not found");

  await requireClientAccess({ principal, clientId: doc.clientId });

  let previewKey = doc.filePath;

  // For S4/S5, we DO NOT expose original here
  if (doc.sensitivityLevel === DocumentSensitivity.S4_HIGHLY_SENSITIVE ||
      doc.sensitivityLevel === DocumentSensitivity.S5_LEGAL_CASE) {
    // If you later generate redacted previews, switch previewKey here
    // For now: block preview if redacted version not available
    return NextResponse.json(
      { error: "Redacted preview required", requiresReasonedAccess: true },
      { status: 403 }
    );
  }

  const signedUrl = await getSignedObjectUrl(previewKey, 60);

  await logDocumentAccess({
    documentId: doc.id,
    actorType: principal.role === UserRole.ADMIN ? UploaderType.ADMIN : UploaderType.ATTORNEY,
    actorId: principal.dbUserId,
    action: "VIEW_PREVIEW",
  });

  return NextResponse.json({ url: signedUrl });
}

