// src/app/api/internal/process-document/route.ts
// Background job for OCR, extraction, and confidence scoring
// This should be called by a queue system or cron job

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/db";

/**
 * Extract safe entities from OCR text (mask SSN/ID, last4 only if needed)
 */
function extractSafeEntities(ocrText: string): Array<{
  entityType: string;
  entityValue: string;
  confidence: number;
}> {
  const entities: Array<{ entityType: string; entityValue: string; confidence: number }> = [];

  // Extract policy number (safe to show)
  const policyNumberMatch = ocrText.match(/(?:policy|policy\s*#|policy\s*number)[\s:]*([A-Z0-9\-]+)/i);
  if (policyNumberMatch) {
    entities.push({
      entityType: "policy_number",
      entityValue: policyNumberMatch[1],
      confidence: 0.8,
    });
  }

  // Extract beneficiary names (safe to show)
  const nameMatches = ocrText.match(/(?:beneficiary|beneficiaries?)[\s:]*([A-Z][a-z]+\s+[A-Z][a-z]+)/gi);
  if (nameMatches) {
    nameMatches.forEach(match => {
      const nameMatch = match.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
      if (nameMatch) {
        entities.push({
          entityType: "beneficiary_name",
          entityValue: nameMatch[1],
          confidence: 0.7,
        });
      }
    });
  }

  // Extract SSN last 4 only (mask full SSN)
  const ssnMatch = ocrText.match(/\b\d{3}-\d{2}-(\d{4})\b/);
  if (ssnMatch) {
    entities.push({
      entityType: "ssn_last4",
      entityValue: `****-**-${ssnMatch[1]}`,
      confidence: 0.9,
    });
  }

  return entities;
}

/**
 * Calculate confidence score based on OCR quality and extracted data
 */
function calculateConfidenceScore(
  ocrConfidence: number | null,
  extractedEntities: number
): number {
  let score = 0.5; // Base score

  if (ocrConfidence !== null) {
    score = ocrConfidence * 0.7; // OCR confidence is 70% of total
  }

  // More entities = higher confidence
  if (extractedEntities > 0) {
    score += Math.min(extractedEntities * 0.1, 0.3); // Up to 30% boost
  }

  return Math.min(score, 1.0);
}

export async function POST(req: NextRequest) {
  try {
    // Internal API - should be protected by API key or internal network
    const authHeader = req.headers.get("authorization");
    const expectedKey = process.env.INTERNAL_API_KEY;
    
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    // Get document
    const document = await prisma.documents.findUnique({
      where: { id: documentId },
      include: {
        clients: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (document.classificationStatus !== "PENDING_OCR") {
      return NextResponse.json(
        { error: "Document already processed" },
        { status: 400 }
      );
    }

    // TODO: Perform actual OCR here
    // For now, we'll simulate OCR results
    // In production, integrate with Tesseract.js, Google Cloud Vision, or AWS Textract
    
    const ocrText = ""; // Placeholder - would contain OCR results
    const ocrConfidence = 0.85; // Placeholder

    // Extract safe entities
    const entities = extractSafeEntities(ocrText);

    // Calculate confidence score
    const confidenceScore = calculateConfidenceScore(ocrConfidence, entities.length);

    // Set status based on confidence
    const classificationStatus = confidenceScore >= 0.85 ? "AUTO_ACCEPTED" : "NEEDS_REVIEW";

    // Update document
    await prisma.documents.update({
      where: { id: document.id },
      data: {
        ocrConfidence: ocrConfidence,
        confidenceScore: confidenceScore,
        classificationStatus: classificationStatus,
        extractedData: {
          entities: entities,
          ocrText: ocrText.substring(0, 1000), // Store first 1000 chars only
        },
      },
    });

    // Create document_extractions records
    for (const entity of entities) {
      await prisma.document_extractions.create({
        data: {
          id: crypto.randomUUID(),
          documentId: document.id,
          entityType: entity.entityType,
          entityValue: entity.entityValue,
          confidence: entity.confidence,
        },
      });
    }

    // If beneficiaries detected, create beneficiary rows
    const beneficiaryEntities = entities.filter(e => e.entityType === "beneficiary_name");
    for (const entity of beneficiaryEntities) {
      const nameParts = entity.entityValue.split(" ");
      if (nameParts.length >= 2) {
        await prisma.beneficiaries.create({
          data: {
            id: crypto.randomUUID(),
            clientId: document.clientId,
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" "),
            verificationStatus: "PENDING",
          },
        });
      }
    }

    // Log processing
    await writeAuditLog({
      action: "OCR_COMPLETED",
      message: `OCR completed for document ${document.fileName}`,
      userId: null,
      clientId: document.clientId,
    });

    await writeAuditLog({
      action: "EXTRACTION_COMPLETED",
      message: `Extracted ${entities.length} entities from document ${document.fileName}`,
      userId: null,
      clientId: document.clientId,
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        classificationStatus: classificationStatus,
        confidenceScore: confidenceScore,
        entitiesExtracted: entities.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: "Failed to process document", details: message },
      { status: 500 }
    );
  }
}

