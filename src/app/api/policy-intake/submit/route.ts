import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { extractPolicyData } from "@/lib/ocr";
import { storeFile } from "@/lib/storage";
import { generateDocumentHash } from "@/lib/document-hash";
import { generateReceiptHash } from "@/lib/audit-hash";
import { renderToStream } from "@react-pdf/renderer";
import { ClientReceiptPDF } from "@/pdfs/ClientReceiptPDF";

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
          id, email, first_name, last_name, phone, date_of_birth, created_at, updated_at
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

    // Find or create insurer
    let insurerId: string;
    const existingInsurer = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM insurers WHERE name = $1 LIMIT 1
    `, policyData.insurerName);

    if (existingInsurer.length > 0) {
      insurerId = existingInsurer[0].id;
    } else {
      insurerId = randomUUID();
      await prisma.$executeRawUnsafe(`
        INSERT INTO insurers (id, name, contact_phone, contact_email, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `,
        insurerId,
        policyData.insurerName,
        policyData.insurerPhone || null,
        policyData.insurerEmail || null
      );
    }

    // Process document if provided
    let documentId: string | null = null;
    let documentHash: string | null = null;
    let extractedData: any = null;

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

      // Store file
      const { filePath } = await storeFile(file, clientId);
      documentId = randomUUID();
      await prisma.$executeRawUnsafe(`
        INSERT INTO documents (
          id, client_id, file_name, file_type, file_size, file_path, mime_type,
          uploaded_via, extracted_data, ocr_confidence, document_hash, created_at, updated_at
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
        id, client_id, insurer_id, policy_number, policy_type,
        verification_status, document_hash, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'PENDING', $6, NOW(), NOW()
      )
    `,
      policyId,
      clientId,
      insurerId,
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
        id, client_id, status, submission_type, submitted_data, processed_at, created_at, updated_at
      ) VALUES (
        $1, $2, 'COMPLETED', 'POLICY_INTAKE', $3, NOW(), NOW(), NOW()
      )
    `,
      submissionId,
      clientId,
      JSON.stringify({ clientData, policyData })
    );

    // Generate receipt
    const receiptId = `REC-${clientId}-${Date.now()}`;
    const receiptHash = generateReceiptHash({
      receiptId,
      clientId,
      createdAt: new Date(),
      policies: [{ id: policyId, policyNumber: policyData.policyNumber || null }],
    });

    await prisma.$executeRawUnsafe(`
      INSERT INTO receipts (
        id, client_id, submission_id, receipt_number, created_at
      ) VALUES (
        $1, $2, $3, $4, NOW()
      )
    `,
      randomUUID(),
      clientId,
      submissionId,
      receiptId
    );

    return NextResponse.json({
      success: true,
      receiptId,
      receiptHash,
      policyId,
      clientId,
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

