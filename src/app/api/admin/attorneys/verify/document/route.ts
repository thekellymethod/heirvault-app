import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase";

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

    // Get attorney profile with license document
    const profile = await prisma.attorneyProfile.findUnique({
      where: { userId },
      select: {
        licenseDocumentPath: true,
        licenseDocumentName: true,
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!profile || !profile.licenseDocumentPath) {
      return NextResponse.json(
        { error: "License document not found" },
        { status: 404 }
      );
    }

    // Download file from Supabase storage
    const bucket = process.env.HEIRVAULT_STORAGE_BUCKET || "heirvault-docs";
    const sb = supabaseServer();
    const { data, error } = await sb.storage
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
  } catch (error: any) {
    console.error("License document download error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download license document" },
      { status: error.status || 500 }
    );
  }
}

