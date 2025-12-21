import { NextRequest, NextResponse } from "next/server";
import { verifyQRToken } from "@/lib/qr";
import { getRegistryById, appendRegistryVersion, logAccess } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { createHash } from "crypto";
import { randomUUID } from "crypto";
import { db, documents } from "@/lib/db";

/**
 * Registry Records API
 * Public endpoint - no authentication required (uses signed tokens)
 * 
 * Verify token
 * Append new registry version
 * Hash + store delta
 * Log version lineage
 * 
 * CRITICAL: Do not allow edits. Only append.
 * This is where many systems fail.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Extract token
    const token = formData.get("token") as string;
    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Verify token
    const payload = verifyQRToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 403 }
      );
    }

    // Validate expiry
    if (Date.now() > payload.expiresAt) {
      return NextResponse.json(
        { error: "Token has expired" },
        { status: 403 }
      );
    }

    // Load current registry to get latest version
    const registry = await getRegistryById(payload.registryId);
    const currentVersion = registry.latestVersion;
    
    if (!currentVersion) {
      return NextResponse.json(
        { error: "Registry has no versions" },
        { status: 404 }
      );
    }

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

    // Get current data from latest version
    const currentData = currentVersion.dataJson as Record<string, unknown>;

    // Prepare new data
    const newData = {
      decedentName: decedentName.trim(),
      policyNumber: policyNumber?.trim() || null,
      policyType: policyType?.trim() || null,
      insurerName: insurerName?.trim() || null,
      contactEmail: contactEmail?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      updatedAt: new Date().toISOString(),
    };

    // Calculate delta (what changed)
    // CRITICAL: Store delta to show what changed from previous version
    const delta: Record<string, { from: unknown; to: unknown }> = {};
    
    const fieldsToCompare = [
      "decedentName",
      "policyNumber",
      "policyType",
      "insurerName",
      "contactEmail",
      "contactPhone",
    ];

    for (const field of fieldsToCompare) {
      const currentValue = currentData[field];
      const newValue = newData[field as keyof typeof newData];
      
      // Only include in delta if value actually changed
      if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
        delta[field] = {
          from: currentValue ?? null,
          to: newValue ?? null,
        };
      }
    }

    // Handle document upload if provided
    let documentHash: string | null = null;
    let documentPath: string | null = null;
    let documentId: string | null = null;

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

      // Add document info to new data
      (newData as Record<string, unknown>).documentHash = documentHash;
      (newData as Record<string, unknown>).documentId = null; // Will be set after document creation
    }

    // Hash the new data for integrity
    const dataHash = createHash("sha256")
      .update(JSON.stringify(newData))
      .digest("hex");

    // Add hash and delta to new data
    (newData as Record<string, unknown>).submissionHash = dataHash;
    (newData as Record<string, unknown>).delta = delta;
    (newData as Record<string, unknown>).previousVersionId = currentVersion.id;

    // CRITICAL: Append new version (do not edit existing version)
    // This is where many systems fail - they try to update in place
    const newVersion = await appendRegistryVersion({
      registryId: payload.registryId,
      data: newData,
      submittedBy: "INTAKE", // Updated via intake QR code
    });

    // If document was uploaded, create document record and link to new version
    if (file && documentHash && documentPath && newVersion) {
      documentId = randomUUID();
      
      // Create placeholder client ID (registry-first design)
      const placeholderClientId = randomUUID();
      
      // Store document record linked to new version
      await db.insert(documents).values({
        id: documentId,
        clientId: placeholderClientId,
        registryVersionId: newVersion.id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        filePath: documentPath,
        mimeType: file.type,
        uploadedVia: "qr_update",
        documentHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update new version data with document ID (would require new version, but for now just log)
      // In a fully immutable system, we'd create another version, but for documents this is acceptable
    }

    // Log version lineage (legal backbone - every route handler must call this)
    // Audit: REGISTRY_UPDATED_BY_TOKEN
    await logAccess({
      registryId: payload.registryId,
      userId: null, // System action (public update via QR)
      action: "REGISTRY_UPDATED_BY_TOKEN",
      metadata: {
        source: "qr_update",
        versionId: newVersion.id,
        previousVersionId: currentVersion.id,
        hasDocument: !!file,
        documentHash: documentHash || null,
        changes: Object.keys(delta),
        delta: Object.keys(delta).length > 0 ? delta : null,
      },
    });

    // Return success (never return registry ID directly)
    return NextResponse.json({
      success: true,
      message: "Update submitted successfully. A new version has been created.",
      versionId: newVersion.id,
      changes: Object.keys(delta).length > 0 ? delta : "No changes detected",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in record update:", errorMessage);
    return NextResponse.json(
      { error: errorMessage || "Failed to process update" },
      { status: 500 }
    );
  }
}
