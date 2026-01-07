// src/lib/worker/processDocument.ts
;
import { putObject } from "@/lib/storage";
import { DocumentClassificationStatus } from "@/lib/db/enums";
import { supersedePriorVersions } from "@/lib/versioning";
import crypto from "crypto";

type DocumentRecord = {
  id: string;
  clientId: string;
  filePath: string;
  sensitivityLevel?: string;
  [key: string]: unknown;
};

type ClientRecord = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  [key: string]: unknown;
};

type PolicyRecord = {
  policyNumber: string | null;
  carrierName: string | null;
  carrierAlias: string | null;
  [key: string]: unknown;
};

// This is a wrapper that ensures idempotent processing
// The actual processing logic is in processPendingDocuments
export async function processDocument(documentId: string) {
  const { findUnique, findMany: findManyDb } = await import("@/lib/db");
  
  const doc = await findUnique<DocumentRecord>("documents", { id: documentId });
  
  if (!doc) {
    console.error(`Document ${documentId} not found`);
    return;
  }
  
  // Fetch client separately
  const clients = await findManyDb<ClientRecord>("clients", {
    where: { id: doc.clientId },
    limit: 1,
  });
  
  const client = clients && clients.length > 0 ? clients[0] : null;
  
  if (!client) {
    console.error(`Client not found for document ${documentId}`);
    return;
  }

  // If already processed and we have derived keys, we can skip re-processing
  // unless you want to force re-run (which will overwrite stable keys)
  const extractedKey = `private/derived/${doc.clientId}/${doc.id}/extracted.json`;
  const _previewKey = `private/derived/${doc.clientId}/${doc.id}/preview-redacted.pdf`;

  try {
    // Import and use the existing processing logic directly
    // We'll call the internal processing function
    const { textractDetectText } = await import("@/lib/textractOcr");
    const { blocksToText, parseEntitiesFromText } = await import("@/lib/textractParse");
    const { scoreDocument } = await import("@/lib/confidence");
    const { auditLog } = await import("@/lib/audit");
    const { tryCompleteInvite: _tryCompleteInvite } = await import("@/lib/inviteCompletion");
    const { normalizeCarrier, normalizePolicyNumber, nameSimilarity, dobMatch } = await import("@/lib/match");
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { Readable: _Readable } = await import("stream");
    
    // Read document bytes from S3
    const s3 = new S3Client({
      region: process.env.S3_REGION!,
      endpoint: process.env.S3_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });

    async function readObjectBytes(key: string): Promise<Buffer> {
      const resp = await s3.send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      }));
      const body = resp.Body;
      if (!body) throw new Error("Missing S3 body");
      const chunks: Buffer[] = [];
      const readableStream = body as unknown as InstanceType<typeof _Readable>;
      for await (const chunk of readableStream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return Buffer.concat(chunks);
    }

    // Process the document using the same logic as processPendingDocuments
    const bytes = await readObjectBytes(doc.filePath);
    const ocr = await textractDetectText(bytes);
    const text = blocksToText(ocr.Blocks ?? []);
    const entities = parseEntitiesFromText(text);

    // Get expected policy for matching
    const { findMany: findManyPolicies } = await import("@/lib/db");
    const policies = await findManyPolicies<PolicyRecord>("policies", {
      where: { clientId: doc.clientId },
      orderBy: { column: "createdAt", ascending: false },
      limit: 1,
    });
    const expectedPolicy: PolicyRecord | null = policies && policies.length > 0 ? policies[0] : null;

    // Match against expected fields
    const expectedName = `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim();
    const extractedName = entities.policyholderName ?? null;
    const nameSim = nameSimilarity(expectedName, extractedName);
    const isNameMatch = nameSim >= 0.75;
    // Convert string dateOfBirth to Date if needed, or pass as string
    const clientDob = client.dateOfBirth ? new Date(client.dateOfBirth) : null;
    const isDobMatch = dobMatch(clientDob, entities.dob ?? null);
    const expectedPolicyNumberNorm = normalizePolicyNumber(expectedPolicy?.policyNumber ?? null);
    const extractedPolicyNumberNorm = normalizePolicyNumber(entities.policyNumberMasked ?? null);
    const isPolicyNumberMatch = !!expectedPolicyNumberNorm && !!extractedPolicyNumberNorm && expectedPolicyNumberNorm === extractedPolicyNumberNorm;
    const expectedCarrierNorm = normalizeCarrier(expectedPolicy?.carrierName ?? expectedPolicy?.carrierAlias ?? null);
    const extractedCarrierNorm = normalizeCarrier(entities.carrier ?? null);
    const isCarrierMatch = !!expectedCarrierNorm && !!extractedCarrierNorm && (expectedCarrierNorm.includes(extractedCarrierNorm) || extractedCarrierNorm.includes(expectedCarrierNorm));

    const { score, reasons } = scoreDocument({
      nameMatch: isNameMatch,
      dobMatch: isDobMatch,
      policyNumberMatch: isPolicyNumberMatch,
      carrierMatch: isCarrierMatch,
      docTypeConfidence: 0.75,
    });

    // Determine classification status
    const needsReview = doc.sensitivityLevel === "S4_HIGHLY_SENSITIVE" || doc.sensitivityLevel === "S5_LEGAL_CASE" || score < 70;
    const nextStatus = needsReview ? DocumentClassificationStatus.NEEDS_REVIEW : DocumentClassificationStatus.AUTO_ACCEPTED;

    // Store extraction and update document
    const extractionData = {
      policyholderName: entities.policyholderName ?? null,
      policyNumberMasked: entities.policyNumberMasked ?? null,
      carrier: entities.carrier ?? null,
      dob: entities.dob ?? null,
      idNumberLast4: entities.idNumberLast4 ?? null,
      beneficiaries: entities.beneficiaries ?? [],
      rawTextPreview: entities.rawTextPreview ?? "",
      matches: {
        nameSimilarity: nameSim,
        nameMatch: isNameMatch,
        dobMatch: isDobMatch,
        policyNumberMatch: isPolicyNumberMatch,
        carrierMatch: isCarrierMatch,
      },
    };

    const { transaction, upsert: upsertDb, update: updateDb, create: createDb } = await import("@/lib/db");
    
    await transaction(async () => {
      // Upsert document extraction
      await upsertDb("document_extractions", {
        documentId: doc.id,
        entities: extractionData,
        modelVersion: "textract-detecttext-v1",
      }, "documentId");

      // Update document
      await updateDb("documents", { id: doc.id }, {
        classificationStatus: nextStatus,
        confidenceScore: score,
        confidenceReason: reasons,
        extractedData: extractionData,
        ocrConfidence: 0.85,
        updatedAt: new Date().toISOString(),
      });

      // Create beneficiaries if detected
      if (entities.beneficiaries?.length) {
        for (const b of entities.beneficiaries) {
          const nameParts = b.fullName.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          if (firstName && lastName) {
            await createDb("beneficiaries", {
              id: crypto.randomUUID(),
              clientId: doc.clientId,
              firstName: firstName,
              lastName: lastName,
              verificationStatus: "PENDING",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    });

    // Audit log
    await auditLog({
      actorType: "SYSTEM",
      actorId: null,
      clientId: doc.clientId,
      inviteId: null,
      action: "DOC_PROCESSED",
      metadata: { documentId: doc.id, score, status: nextStatus },
    });

    // After processing, update derived keys if needed
    type UpdatedDocument = {
      extractedData?: unknown;
      extractedJsonKey?: string | null;
      classificationStatus?: string;
      [key: string]: unknown;
    };
    
    const { findUnique: findUniqueDb, update: updateDb2 } = await import("@/lib/db");
    const updated = await findUniqueDb<UpdatedDocument>("documents", { id: documentId });
    
    if (updated && updated.extractedData) {
      // Store extracted JSON if not already stored
      if (!updated.extractedJsonKey) {
        const extractedBuf = Buffer.from(JSON.stringify(updated.extractedData, null, 2), "utf8");
        await putObject({ 
          key: extractedKey, 
          body: extractedBuf, 
          contentType: "application/json" 
        });
        
        await updateDb2("documents", { id: documentId }, { 
          extractedJsonKey: extractedKey,
          updatedAt: new Date().toISOString(),
        });
      }

      // For now, we'll skip redacted preview generation as it requires additional setup
      // You can add it later when you implement the redaction pipeline
      // if (!updated.redactedPreviewKey && doc.sensitivityLevel === "S4_HIGHLY_SENSITIVE" || doc.sensitivityLevel === "S5_LEGAL_CASE") {
      //   const previewBuf = await buildRedactedPreviewPdf({ ... });
      //   await putObject({ key: previewKey, body: previewBuf, contentType: "application/pdf" });
      //   await updateDb2("documents", { id: documentId }, { redactedPreviewKey: previewKey, updatedAt: new Date().toISOString() });
      // }
    }

    // Supersede older versions only if accepted automatically
    if (updated?.classificationStatus === DocumentClassificationStatus.AUTO_ACCEPTED) {
      await supersedePriorVersions(documentId);
    }

    // Mark as processed
    await updateDb2("documents", { id: documentId }, {
      processingState: "PROCESSED",
      processingLockedAt: null,
      lastProcessingError: null,
      updatedAt: new Date().toISOString(),
    });

  } catch (e) {
    const error = e as Error | { message?: string };
    const errorMsg = String(error?.message ?? error).slice(0, 500);
    console.error(`Processing failed for document ${documentId}:`, errorMsg);
    
    const { update: updateDbError } = await import("@/lib/db");
    await updateDbError("documents", { id: documentId }, {
      processingState: "FAILED",
      processingLockedAt: null,
      lastProcessingError: errorMsg,
      updatedAt: new Date().toISOString(),
    });
    
    throw e; // Re-throw so caller knows it failed
  }
}

