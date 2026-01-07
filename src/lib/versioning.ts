// src/lib/versioning.ts
;
import { DocumentClassificationStatus } from "@/lib/db/enums";

type DocumentRecord = {
  id: string;
  clientId: string;
  versionGroupId: string | null;
  classificationStatus: string;
  versionNumber?: number | null;
  supersededAt?: string | null;
  supersededById?: string | null;
};

export async function supersedePriorVersions(documentId: string) {
  const { findUnique, update: updateDoc } = await import("@/lib/db");
  
  const doc = await findUnique<DocumentRecord>("documents", { id: documentId });
  if (!doc?.versionGroupId) return;

  const accepted =
    doc.classificationStatus === DocumentClassificationStatus.APPROVED ||
    doc.classificationStatus === DocumentClassificationStatus.AUTO_ACCEPTED;

  if (!accepted) return;

  // Find prior versions - need to use direct Supabase query for "not" operator
  const { getDb } = await import("@/lib/db");
  const db = getDb();
  const { data: priorDocs } = await db
    .from("documents")
    .select("*")
    .eq("clientId", doc.clientId)
    .eq("versionGroupId", doc.versionGroupId)
    .neq("id", doc.id)
    .is("supersededAt", null)
    .order("versionNumber", { ascending: false })
    .limit(1);

  const prior = priorDocs && priorDocs.length > 0 ? (priorDocs[0] as DocumentRecord) : null;

  if (!prior) return;

  await updateDoc("documents", { id: prior.id }, {
    supersededById: doc.id,
    supersededAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

