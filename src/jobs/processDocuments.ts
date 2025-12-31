// src/jobs/processDocuments.ts
import { prisma } from "@/lib/db";
import { textractDetectText } from "@/lib/textractOcr";
import { blocksToText, parseEntitiesFromText } from "@/lib/textractParse";
import { scoreDocument } from "@/lib/confidence";
import { auditLog } from "@/lib/audit";
import { tryCompleteInvite } from "@/lib/inviteCompletion";
import { supersedePriorVersions } from "@/lib/versioning";
import {
  DocumentClassificationStatus,
  DocumentSensitivity,
  UploaderType,
} from "@prisma/client";
import { normalizeCarrier, normalizePolicyNumber, nameSimilarity, dobMatch } from "@/lib/match";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import crypto from "crypto";

// We need a safe way to fetch the raw bytes from private storage.
// Since we used S3 putObject, we'll fetch directly from S3 server-side.
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

  // Body can be ReadableStream/Readable
  const chunks: Buffer[] = [];
  const stream = body as unknown as Readable;
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function shouldForceReviewStrong(params: {
  sensitivity: DocumentSensitivity;
  score: number;
  nameMatch: boolean;
  dobMatch: boolean;
  policyMatch: boolean;
  carrierMatch: boolean;
  docType: string;
}) {
  // S5 legal-case: always review
  if (params.sensitivity === DocumentSensitivity.S5_LEGAL_CASE) return true;

  // S4: require very high score AND identity corroboration
  if (params.sensitivity === DocumentSensitivity.S4_HIGHLY_SENSITIVE) {
    // For government IDs: require name + DOB match; for tax docs at least one corroboration
    const isGovId = params.docType === "DRIVERS_LICENSE" || params.docType === "PASSPORT";
    if (isGovId) return !(params.score >= 90 && params.nameMatch && params.dobMatch);
    // Tax: require score>=90 and at least name match (DOB match if present)
    return !(params.score >= 90 && (params.nameMatch || params.dobMatch));
  }

  // S3: normal documents
  if (params.sensitivity === DocumentSensitivity.S3_CONFIDENTIAL) {
    // If policy document: accept when policy+carrier match even if score slightly lower
    const isPolicy = params.docType === "POLICY";
    if (isPolicy) {
      if (params.score >= 85) return false;
      if (params.score >= 80 && params.policyMatch && params.carrierMatch) return false;
      return true;
    }
    return params.score < 85;
  }

  // Everything else: conservative
  return params.score < 85;
}

export async function processPendingDocuments(params: { limit?: number } = {}) {
  const limit = params.limit ?? 10;

  const docs = await prisma.documents.findMany({
    where: { classificationStatus: DocumentClassificationStatus.PENDING_OCR },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { 
      clients: true,
      // Note: documents doesn't have inviteId directly, but we can find via uploadedVia
    },
  });

  const results: Array<{ id: string; status: string }> = [];

  for (const doc of docs) {
    try {
      // Find invite if this was uploaded via invite
      const invite = doc.uploadedVia === "CLIENT_INVITE_UPLOAD"
        ? await prisma.client_invites.findFirst({
            where: {
              clientId: doc.clientId,
              createdAt: { lte: doc.createdAt },
            },
            orderBy: { createdAt: "desc" },
          })
        : null;

      await auditLog({
        actorType: UploaderType.SYSTEM,
        actorId: null,
        clientId: doc.clientId,
        inviteId: invite?.id ?? null,
        action: "OCR_STARTED",
        metadata: { docType: doc.fileType, sensitivity: doc.sensitivityLevel },
      });

      // Use filePath as storage key (matches what we stored in upload route)
      const bytes = await readObjectBytes(doc.filePath);

      // Textract sync OCR
      const ocr = await textractDetectText(bytes);
      const text = blocksToText(ocr.Blocks ?? []);

      const entities = parseEntitiesFromText(text);

      // Load latest expected policy for this client (if any)
      const expectedPolicy = await prisma.expected_policies.findFirst({
        where: { clientId: doc.clientId },
        orderBy: { createdAt: "desc" },
      });

      const expectedName = `${doc.clients.firstName ?? ""} ${doc.clients.lastName ?? ""}`.trim();
      const extractedName = entities.policyholderName ?? null;

      const nameSim = nameSimilarity(expectedName, extractedName);
      const isNameMatch = nameSim >= 0.75;

      const isDobMatch = dobMatch(doc.clients.dateOfBirth ?? null, entities.dob ?? null);

      const expectedPolicyNumberNorm = normalizePolicyNumber(expectedPolicy?.policyNumber ?? null);
      const extractedPolicyNumberNorm = normalizePolicyNumber(entities.policyNumberMasked ?? null); // masked but still alnum
      const isPolicyNumberMatch =
        !!expectedPolicyNumberNorm && !!extractedPolicyNumberNorm && expectedPolicyNumberNorm === extractedPolicyNumberNorm;

      const expectedCarrierNorm = normalizeCarrier(expectedPolicy?.carrierName ?? expectedPolicy?.carrierAlias ?? null);
      const extractedCarrierNorm = normalizeCarrier(entities.carrier ?? null);
      const isCarrierMatch =
        !!expectedCarrierNorm && !!extractedCarrierNorm && (expectedCarrierNorm.includes(extractedCarrierNorm) || extractedCarrierNorm.includes(expectedCarrierNorm));

      // Confidence scoring (internal)
      const { score, reasons: _reasons } = scoreDocument({
        nameMatch: isNameMatch,
        dobMatch: isDobMatch,
        policyNumberMatch: isPolicyNumberMatch,
        carrierMatch: isCarrierMatch,
        docTypeConfidence: 0.75,
      });

      // Decide route with tightened gates
      const needsReview = shouldForceReviewStrong({
        sensitivity: doc.sensitivityLevel,
        score,
        nameMatch: isNameMatch,
        dobMatch: isDobMatch,
        policyMatch: isPolicyNumberMatch,
        carrierMatch: isCarrierMatch,
        docType: doc.fileType,
      });
      const nextStatus = needsReview ? DocumentClassificationStatus.NEEDS_REVIEW : DocumentClassificationStatus.AUTO_ACCEPTED;

      await prisma.$transaction(async (tx) => {
        // Store extracted entities in document_extractions (using entityType/entityValue structure)
        // Also store in extractedData JSON for convenience
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

        // Delete old extractions for this document
        await tx.document_extractions.deleteMany({
          where: { documentId: doc.id },
        });

        // Create new document_extractions records
        if (entities.policyNumberMasked) {
          await tx.document_extractions.create({
            data: {
              id: crypto.randomUUID(),
              documentId: doc.id,
              entityType: "policy_number",
              entityValue: entities.policyNumberMasked,
              confidence: 0.8,
            },
          });
        }

        if (entities.carrier) {
          await tx.document_extractions.create({
            data: {
              id: crypto.randomUUID(),
              documentId: doc.id,
              entityType: "carrier",
              entityValue: entities.carrier,
              confidence: 0.7,
            },
          });
        }

        if (entities.idNumberLast4) {
          await tx.document_extractions.create({
            data: {
              id: crypto.randomUUID(),
              documentId: doc.id,
              entityType: "id_number_last4",
              entityValue: entities.idNumberLast4,
              confidence: 0.9,
            },
          });
        }

        // Store beneficiary names as extractions too
        if (entities.beneficiaries?.length) {
          for (const b of entities.beneficiaries) {
            await tx.document_extractions.create({
              data: {
                id: crypto.randomUUID(),
                documentId: doc.id,
                entityType: "beneficiary_name",
                entityValue: b.fullName,
                confidence: 0.7,
              },
            });
          }
        }

        // Store numeric score internally, but do not expose it to policyholders
        await tx.documents.update({
          where: { id: doc.id },
          data: {
            classificationStatus: nextStatus,
            confidenceScore: score,
            extractedData: extractionData, // Store in JSON field for convenience
            ocrConfidence: 0.85, // Placeholder OCR confidence
          },
        });

        // Create beneficiaries (very conservative)
        if (entities.beneficiaries?.length) {
          for (const b of entities.beneficiaries) {
            // Parse fullName into firstName/lastName
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

      await auditLog({
        actorType: UploaderType.SYSTEM,
        actorId: null,
        clientId: doc.clientId,
        inviteId: invite?.id ?? null,
        action: "OCR_COMPLETED",
        metadata: { documentId: doc.id },
      });

      await auditLog({
        actorType: UploaderType.SYSTEM,
        actorId: null,
        clientId: doc.clientId,
        inviteId: invite?.id ?? null,
        action: "DOC_SCORED",
        metadata: {
          documentId: doc.id,
          score,
          routed: nextStatus,
          sensitivity: doc.sensitivityLevel,
        },
      });

      // Try to complete invite if document was auto-accepted
      if (invite && nextStatus === DocumentClassificationStatus.AUTO_ACCEPTED) {
        await tryCompleteInvite(invite.id);
      }

      // Supersede prior versions if document was accepted
      if (nextStatus === DocumentClassificationStatus.AUTO_ACCEPTED) {
        await supersedePriorVersions(doc.id);
      }

      results.push({ id: doc.id, status: nextStatus });
    } catch (err) {
      const _error = err as Error;
      await prisma.documents.update({
        where: { id: doc.id },
        data: { classificationStatus: DocumentClassificationStatus.NEEDS_REVIEW },
      });

      const invite = doc.uploadedVia === "CLIENT_INVITE_UPLOAD"
        ? await prisma.client_invites.findFirst({
            where: {
              clientId: doc.clientId,
              createdAt: { lte: doc.createdAt },
            },
            orderBy: { createdAt: "desc" },
          })
        : null;

      await auditLog({
        actorType: UploaderType.SYSTEM,
        actorId: null,
        clientId: doc.clientId,
        inviteId: invite?.id ?? null,
        action: "OCR_FAILED",
        metadata: { documentId: doc.id, message: String(err?.message ?? err) },
      });

      results.push({ id: doc.id, status: "FAILED_TO_REVIEW" });
    }
  }

  return results;
}

