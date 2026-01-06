// src/lib/versioning.ts
;
import { DocumentClassificationStatus } from "@prisma/client";

export async function supersedePriorVersions(documentId: string) {
  const doc = await prisma.documents.findUnique({ where: { id: documentId } });
  if (!doc?.versionGroupId) return;

  const accepted =
    doc.classificationStatus === DocumentClassificationStatus.APPROVED ||
    doc.classificationStatus === DocumentClassificationStatus.AUTO_ACCEPTED;

  if (!accepted) return;

  const prior = await prisma.documents.findFirst({
    where: {
      clientId: doc.clientId,
      versionGroupId: doc.versionGroupId,
      id: { not: doc.id },
      supersededAt: null,
    },
    orderBy: { versionNumber: "desc" },
  });

  if (!prior) return;

  await prisma.documents.update({
    where: { id: prior.id },
    data: {
      supersededById: doc.id,
      supersededAt: new Date(),
    },
  });
}

