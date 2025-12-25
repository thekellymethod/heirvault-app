import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { extractPolicyData } from "@/lib/ocr";
import { uploadDocument } from "@/lib/storage";
import { generateDocumentHash } from "@/lib/document-hash";
import { generateReceiptHash } from "@/lib/audit-hash";
// PDF generation imports - currently unused but may be needed for future receipt generation
// import { renderToStream } from "@react-pdf/renderer";
// import { ClientReceiptPDF } from "@/pdfs/ClientReceiptPDF";
import { signToken } from "@/lib/qr";
import QRCode from "qrcode";

export const runtime = "nodejs";

/**
 * Submit policy intake (public, no authentication required)
 * Creates client, policy, and document records
 * Generates cryptographic receipt
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const clientDataStr = formData.get("clientData") as string;
    const policyDataStr = formData.get("policyData") as string;
    const file = formData.get("file") as File | null;

    if (!clientDataStr || !policyDataStr) {
      return NextResponse.json(
        { error: "Client and policy data are required" },
        { status: 400 }
      );
    }

    const clientData = JSON.parse(clientDataStr);
    const policyData = JSON.parse(policyDataStr);

    // Validate required fields
    if (!clientData.firstName || !clientData.lastName || !clientData.email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      );
    }

    if (!policyData.insurerName) {
      return NextResponse.json(
        { error: "Insurer name is required" },
        { status: 400 }
      );
    }

    // Create or find client
    let clientId: string;
    const existingClient = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM clients WHERE email = $1 LIMIT 1
    `, clientData.email);

    if (existingClient.length > 0) {
      clientId = existingClient[0].id;
    } else {
      clientId = randomUUID();
      await prisma.$executeRawUnsafe(`
        INSERT INTO clients (
          id, email, firstName, lastName, phone, dateOfBirth, createdAt, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 
          CASE WHEN $6 = '' THEN NULL ELSE $6::date END,
          NOW(), NOW()
        )
      `,
        clientId,
        clientData.email,
        clientData.firstName,
        clientData.lastName,
        clientData.phone || null,
        clientData.dateOfBirth || null
      );
    }

    // Process document if provided (do this first to get extractedData for insurer confidence)
    let documentId: string | null = null;
    let documentHash: string | null = null;
    let extractedData: {
      insurerName?: string,
      policyNumber?: string,
      policyType?: string,
      [key: string]: unknown;
    } | null = null;

    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      documentHash = generateDocumentHash(buffer);

      // Try OCR extraction
      try {
        const ocrResult = await extractPolicyData(file, buffer);
        extractedData = {
          policyNumber: ocrResult.policyNumber,
          policyType: ocrResult.policyType,
          insurerName: ocrResult.insurerName,
        };
      } catch (ocrError) {
        console.error("OCR extraction failed:", ocrError);
        // Continue without extracted data
      }
    }

    // Try to find existing insurer (lazy insurers: don't auto-create)
    let insurerId: string | null = null;
    let carrierNameRaw: string | null = null;
    let carrierConfidence: number | null = null;
    
    const existingInsurer = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM insurers WHERE name = $1 LIMIT 1
    `, policyData.insurerName);

    if (existingInsurer.length > 0) {
      insurerId = existingInsurer[0].id;
    } else {
      // Insurer not found - store raw name instead (lazy insurers)
      carrierNameRaw = policyData.insurerName;
      // If we have OCR data, use its confidence
      if (extractedData && extractedData.insurerName) {
        carrierConfidence = 0.8; // OCR confidence estimate
      }
    }

    // Store file if provided
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const { storagePath } = await uploadDocument({
        fileBuffer: arrayBuffer,
        filename: file.name,
        contentType: file.type,
      });
      const filePath = storagePath;
      documentId = randomUUID();
      await prisma.$executeRawUnsafe(`
        INSERT INTO documents (
          id, client_id, file_name, file_type, file_size, file_path, mime_type,
          uploaded_via, extracted_data, ocr_confidence, document_hash, createdAt, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        )
      `,
        documentId,
        clientId,
        file.name,
        file.type,
        file.size,
        filePath,
        file.type,
        "policy_intake",
        extractedData ? JSON.stringify(extractedData) : null,
        extractedData ? 80 : 0,
        documentHash
      );
    }

    // Create policy
    const policyId = randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO policies (
        id, client_id, insurer_id, carrier_name_raw, carrier_confidence, policy_number, policy_type,
        verification_status, document_hash, createdAt, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, NOW(), NOW()
      )
    `,
      policyId,
      clientId,
      insurerId,
      carrierNameRaw,
      carrierConfidence,
      policyData.policyNumber || null,
      policyData.policyType || null,
      documentHash
    );

    // Link document to policy if exists
    if (documentId) {
      await prisma.$executeRawUnsafe(`
        UPDATE documents SET policy_id = $1 WHERE id = $2
      `, policyId, documentId);
    }

    // Create submission record
    const submissionId = randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO submissions (
        id, client_id, status, submission_type, submitted_data, processed_at, createdAt, updated_at
      ) VALUES (
        $1, $2, 'COMPLETED', 'POLICY_INTAKE', $3, NOW(), NOW(), NOW()
      )
    `,
      submissionId,
      clientId,
      JSON.stringify({ clientData, policyData })
    );

    // Generate receipt ID
    const receiptId = `REC-${clientId}-${Date.now()}`;
    const receiptDbId = randomUUID();

    // Insert receipt first to get the actual database timestamp
    // CRITICAL: We must use the database timestamp (NOW()) not JavaScript Date()
    // to ensure hash consistency during verification
    await prisma.$executeRawUnsafe(`
      INSERT INTO receipts (
        id, client_id, submission_id, receipt_number, createdAt
      ) VALUES (
        $1, $2, $3, $4, NOW()
      )
    `,
      receiptDbId,
      clientId,
      submissionId,
      receiptId
    );

    // Query the receipt back to get the actual database timestamp
    // This ensures the hash uses the exact same timestamp that will be used during verification
    const insertedReceipt = await prisma.$queryRawUnsafe<Array<{
      receipt_number: string,
      createdAt: Date;
    }>>(`
      SELECT receipt_number, createdAt
      FROM receipts
      WHERE id = $1
      LIMIT 1
    `, receiptDbId);

    if (insertedReceipt.length === 0) {
      throw new Error("Failed to retrieve inserted receipt");
    }

    const receiptCreatedAt = insertedReceipt[0].createdAt;

    // CRITICAL: Query ALL policies that existed at the time of receipt creation
    // This matches the verification logic in receipts-audit route
    // If a client already has policies, we must include ALL of them in the hash
    // to ensure the hash matches during verification
    const policiesAtReceiptTime = await prisma.$queryRawUnsafe<Array<{
      id: string,
      policy_number: string | null;
    }>>(`
      SELECT id, policy_number
      FROM policies
      WHERE client_id = $1
        AND createdAt <= $2
      ORDER BY createdAt ASC
    `, clientId, receiptCreatedAt);

    // Generate receipt hash using database timestamp and all policies at that time
    // This ensures the hash will match during verification
    const receiptHash = generateReceiptHash({
      receiptId,
      clientId,
      createdAt: receiptCreatedAt, // Use database timestamp, not JavaScript Date()
      policies: policiesAtReceiptTime.map(p => ({ 
        id: p.id, 
        policyNumber: p.policy_number 
      })),
    });

    // Generate QR token for policy updates
    // Create a token that encodes the client ID for updates
    // Using a simple approach: create a token with clientId:as the "registryId" equivalent
    const qrToken = signToken(
      { 
        registryId: clientId, // Reusing registryId field for clientId
        purpose: "update" 
      },
      60 * 60 * 24 * 365 // 1 year TTL
    );

    // Generate QR code data URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const updateUrl = `${baseUrl}/update-policy/${qrToken}`;
    const qrCodeDataUrl = await QRCode.toDataURL(updateUrl, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 300,
      margin: 2,
    });

    return NextResponse.json({
      success: true,
      receiptId,
      receiptHash,
      policyId,
      clientId,
      qrToken,
      qrCodeDataUrl,
      message: "Policy submitted successfully",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error submitting policy intake:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to submit policy" },
      { status: 500 }
    );
  }
}

