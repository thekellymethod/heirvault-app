import { NextRequest, NextResponse } from "next/server";
import { createRegistry, appendRegistryVersion, logAccess } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { generateQRToken, generateQRCodeDataURL } from "@/lib/qr";
import { createHash } from "crypto";
import { randomUUID } from "crypto";
import { db, documents } from "@/lib/db";

/**
 * Policy Intake API
 * Public endpoint - no authentication required
 * 
 * This route does all the work:
 * - Validate fields
 * - Create registry record
 * - Hash raw submission
 * - Store document via /lib/storage.ts
 * - Create registry version
 * - Generate QR token (/lib/qr.ts)
 * - Return receipt + QR
 * 
 * Important: Never returns registry ID directly. Uses signed token.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Extract form data
    const decedentName = formData.get("decedentName") as string;
    const policyNumber = formData.get("policyNumber") as string | null;
    const policyType = formData.get("policyType") as string | null;
    const insurerName = formData.get("insurerName") as string | null;
    const contactEmail = formData.get("contactEmail") as string | null;
    const contactPhone = formData.get("contactPhone") as string | null;
    const file = formData.get("file") as File | null;

    // Validate required fields
    if (!decedentName || decedentName.trim() === "") {
      return NextResponse.json(
        { error: "Decedent name is required" },
        { status: 400 }
      );
    }

    // Prepare raw submission data for hashing
    const rawSubmission = {
      decedentName: decedentName.trim(),
      policyNumber: policyNumber?.trim() || null,
      policyType: policyType?.trim() || null,
      insurerName: insurerName?.trim() || null,
      contactEmail: contactEmail?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      submittedAt: new Date().toISOString(),
    };

    // Hash raw submission for integrity
    const submissionHash = createHash("sha256")
      .update(JSON.stringify(rawSubmission))
      .digest("hex");

    // Prepare registry data
    const registryData = {
      ...rawSubmission,
      submissionHash,
      documentHash: null as string | null,
      documentId: null as string | null,
    };

    // Handle document upload if provided
    let documentId: string | null = null;
    let documentHash: string | null = null;
    let documentPath: string | null = null;

    if (file) {
      // Validate file type
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Please upload a PDF or image file." },
          { status: 400 }
        );
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File size must be less than 10MB" },
          { status: 400 }
        );
      }

      // Upload file (content-addressed storage)
      // This computes SHA-256 hash and stores file at content-addressed path
      const uploadResult = await uploadFile(file);
      documentHash = uploadResult.hash;
      documentPath = uploadResult.filePath;

      // Update registry data with document hash
      registryData.documentHash = documentHash;
    }

    // Create registry record with initial version
    const registry = await createRegistry({
      decedentName: decedentName.trim(),
      status: "PENDING_VERIFICATION",
      initialData: registryData,
      submittedBy: "INTAKE",
    });

    // If document was uploaded, create document record and link to registry version
    if (file && documentHash && documentPath && registry.latestVersion) {
      documentId = randomUUID();
      
      // Create a placeholder client ID for registry-first design
      // In registry-first design, documents are linked to registry versions, not clients
      // The clientId field is required by schema but not used in registry-first flow
      const placeholderClientId = randomUUID();
      
      // Store document record
      await db.insert(documents).values({
        id: documentId,
        clientId: placeholderClientId, // Placeholder - registry-first design uses registryVersionId
        registryVersionId: registry.latestVersion.id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        filePath: documentPath,
        mimeType: file.type,
        uploadedVia: "intake",
        documentHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update registry data with document ID
      const updatedData = {
        ...registryData,
        documentId,
      };

      // Create a new version with document ID (immutable - nothing updates in place)
      await appendRegistryVersion({
        registryId: registry.id,
        data: updatedData,
        submittedBy: "INTAKE",
      });
    }

    // Generate signed QR token (never return registry ID directly)
    const qrToken = generateQRToken(registry.id, registry.latestVersion?.id);

    // Generate QR code data URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const qrCodeDataUrl = await generateQRCodeDataURL(registry.id, baseUrl);

    // Generate receipt ID (hash of registry ID + timestamp for uniqueness)
    const receiptId = createHash("sha256")
      .update(`${registry.id}-${Date.now()}`)
      .digest("hex")
      .substring(0, 16)
      .toUpperCase();

    // Log access (legal backbone - every route handler must call this)
    // Audit: INTAKE_SUBMITTED
    await logAccess({
      registryId: registry.id,
      userId: null, // System action (intake submission)
      action: "INTAKE_SUBMITTED",
      metadata: {
        source: "intake",
        hasDocument: !!file,
        documentHash: documentHash || null,
        qrToken: qrToken,
        receiptId: receiptId,
      },
    });

    // Return receipt + QR (never return registry ID directly)
    return NextResponse.json({
      success: true,
      receiptId,
      qrToken, // Signed token, not registry ID
      qrCodeDataUrl,
      message: "Policy submitted successfully",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in intake submission:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to process submission" },
      { status: 500 }
    );
  }
}
