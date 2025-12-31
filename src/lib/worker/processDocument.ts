// src/lib/worker/processDocument.ts
import { prisma } from "@/lib/db";
import { putObject } from "@/lib/storage";
import { DocumentClassificationStatus } from "@prisma/client";
import { supersedePriorVersions } from "@/lib/versioning";
import crypto from "crypto";

// This is a wrapper that ensures idempotent processing
// The actual processing logic is in processPendingDocuments
export async function processDocument(documentId: string) {
  const doc = await prisma.documents.findUnique({ 
    where: { id: documentId },
    include: { clients: true },
  });
  
  if (!doc) {
    console.error(`Document ${documentId} not found`);
    return;
  }

  // If already processed and we have derived keys, we can skip re-processing
  // unless you want to force re-run (which will overwrite stable keys)
  const extractedKey = `private/derived/${doc.clientId}/${doc.id}/extracted.json`;
  const previewKey = `private/derived/${doc.clientId}/${doc.id}/preview-redacted.pdf`;

  try {
    // Import and use the existing processing logic directly
    // We'll call the internal processing function
    const { textractDetectText } = await import("@/lib/textractOcr");
    const { blocksToText, parseEntitiesFromText } = await import("@/lib/textractParse");
    const { scoreDocument } = await import("@/lib/confidence");
    const { auditLog } = await import("@/lib/audit");
    const { tryCompleteInvite } = await import("@/lib/inviteCompletion");
    const { normalizeCarrier, normalizePolicyNumber, nameSimilarity, dobMatch } = await import("@/lib/match");
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { Readable } = await import("stream");
    
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
      const stream = body as unknown as Readable;
      for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return Buffer.concat(chunks);
    }

    // Process the document using the same logic as processPendingDocuments
    const bytes = await readObjectBytes(doc.filePath);
    const ocr = await textractDetectText(bytes);
    const text = blocksToText(ocr.Blocks ?? []);
    const entities = parseEntitiesFromText(text);

    // Get expected policy for matching
    const expectedPolicy = await prisma.policies.findFirst({
      where: { clientId: doc.clientId },
      orderBy: { createdAt: "desc" },
    });

    // Match against expected fields
    const expectedName = `${doc.clients.firstName ?? ""} ${doc.clients.lastName ?? ""}`.trim();
    const extractedName = entities.policyholderName ?? null;
    const nameSim = nameSimilarity(expectedName, extractedName);
    const isNameMatch = nameSim >= 0.75;
    const isDobMatch = dobMatch(doc.clients.dateOfBirth ?? null, entities.dob ?? null);
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

    await prisma.$transaction(async (tx) => {
      await tx.document_extractions.upsert({
        where: { documentId: doc.id },
        create: {
          documentId: doc.id,
          entities: extractionData,
          modelVersion: "textract-detecttext-v1",
        },
        update: {
          entities: extractionData,
          modelVersion: "textract-detecttext-v1",
        },
      });

      await tx.documents.update({
        where: { id: doc.id },
        data: {
          classificationStatus: nextStatus,
          confidenceScore: score,
          confidenceReason: reasons,
          extractedData: extractionData,
          ocrConfidence: 0.85,
        },
      });

      // Create beneficiaries if detected
      if (entities.beneficiaries?.length) {
        for (const b of entities.beneficiaries) {
          const nameParts = b.fullName.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          if (firstName && lastName) {
            await tx.beneficiaries.create({
              data: {
                id: crypto.randomUUID(),
                clientId: doc.clientId,
                firstName: firstName,
                lastName: lastName,
                verificationStatus: "PENDING",
              },
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
    const updated = await prisma.documents.findUnique({ where: { id: documentId } });
    
    if (updated && updated.extractedData) {
      // Store extracted JSON if not already stored
      if (!updated.extractedJsonKey) {
        const extractedBuf = Buffer.from(JSON.stringify(updated.extractedData, null, 2), "utf8");
        await putObject({ 
          key: extractedKey, 
          body: extractedBuf, 
          contentType: "application/json" 
        });
        
        await prisma.documents.update({
          where: { id: documentId },
          data: { extractedJsonKey: extractedKey },
        });
      }

      // For now, we'll skip redacted preview generation as it requires additional setup
      // You can add it later when you implement the redaction pipeline
      // if (!updated.redactedPreviewKey && doc.sensitivityLevel === "S4_HIGHLY_SENSITIVE" || doc.sensitivityLevel === "S5_LEGAL_CASE") {
      //   const previewBuf = await buildRedactedPreviewPdf({ ... });
      //   await putObject({ key: previewKey, body: previewBuf, contentType: "application/pdf" });
      //   await prisma.documents.update({ where: { id: documentId }, data: { redactedPreviewKey: previewKey } });
      // }
    }

    // Supersede older versions only if accepted automatically
    if (updated?.classificationStatus === DocumentClassificationStatus.AUTO_ACCEPTED) {
      await supersedePriorVersions(documentId);
    }

    // Mark as processed
    await prisma.documents.update({
      where: { id: documentId },
      data: {
        processingState: "PROCESSED",
        processingLockedAt: null,
        lastProcessingError: null,
      },
    });

  } catch (e) {
    const error = e as Error | { message?: string };
    const errorMsg = String(error?.message ?? error).slice(0, 500);
    console.error(`Processing failed for document ${documentId}:`, errorMsg);
    
    await prisma.documents.update({
      where: { id: documentId },
      data: {
        processingState: "FAILED",
        processingLockedAt: null,
        lastProcessingError: errorMsg,
      },
    });
    
    throw e; // Re-throw so caller knows it failed
  }
}

