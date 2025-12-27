// src/app/api/documents/[documentId]/preview/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVerifiedAttorney } from "@/lib/auth/guards";
import { getSignedObjectUrl } from "@/lib/storage";
import { logDocumentAccess } from "@/lib/accessLog";
import { DocumentSensitivity, UploaderType } from "@prisma/client";

export async function GET(_: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const user = await requireVerifiedAttorney();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId } = await ctx.params;

  const doc = await prisma.documents.findUnique({
    where: { id: documentId },
    include: { clients: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // TODO: enforce attorney/admin role + ownership over client

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
    actorType: user.roles.includes("ADMIN") ? UploaderType.ADMIN : UploaderType.ATTORNEY,
    actorId: user.id,
    action: "VIEW_PREVIEW",
  });

  return NextResponse.json({ url: signedUrl });
}

