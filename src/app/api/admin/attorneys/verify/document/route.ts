import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { findUnique: findUniqueProfile, findUnique: findUniqueUser } = await import("@/lib/db");
    
    // Get attorney profile with license document
    type AttorneyProfileRecord = {
      id: string;
      userId: string;
      licenseDocumentPath: string | null;
      licenseDocumentName: string | null;
    };
    
    const profile = await findUniqueProfile<AttorneyProfileRecord>("attorney_profiles", { userId });

    if (!profile || !profile.licenseDocumentPath) {
      return NextResponse.json(
        { error: "License document not found" },
        { status: 404 }
      );
    }

    // Download file from Supabase storage
    const bucket = process.env.HEIRVAULT_STORAGE_BUCKET || "heirvault-docs";
    const db = getDb();
    const { data, error } = await db.storage
      .from(bucket)
      .download(profile.licenseDocumentPath);

    if (error || !data) {
      console.error("Error downloading license document:", error);
      return NextResponse.json(
        { error: "Failed to download license document" },
        { status: 500 }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type
    const contentType = profile.licenseDocumentName?.endsWith(".pdf")
      ? "application/pdf"
      : profile.licenseDocumentName?.endsWith(".png")
      ? "image/png"
      : "image/jpeg";

    // Return file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${profile.licenseDocumentName || "license-document"}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 500;
    console.error("License document download error:", error);
    return NextResponse.json(
      { error: message || "Failed to download license document" },
      { status }
    );
  }
}

