import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/clerk";
import { extractPolicyData } from "@/lib/ocr";

export async function POST(req: NextRequest) {
  // Allow unauthenticated requests for invite-based uploads
  // Authentication is handled at the route level that calls this

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

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

    // Convert file to buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract data using OCR
    const ocrResult = await extractPolicyData(file, buffer);
    
    const extracted: {
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string | null;
      dateOfBirth: Date | null;
      policyNumber: string | null;
      policyType: string | null;
      insurerName: string | null;
      insurerPhone: string | null;
      insurerEmail: string | null;
    } = {
      firstName: ocrResult.firstName,
      lastName: ocrResult.lastName,
      email: ocrResult.email,
      phone: ocrResult.phone,
      dateOfBirth: ocrResult.dateOfBirth ? new Date(ocrResult.dateOfBirth) : null,
      policyNumber: ocrResult.policyNumber,
      policyType: ocrResult.policyType,
      insurerName: ocrResult.insurerName,
      insurerPhone: ocrResult.insurerPhone,
      insurerEmail: ocrResult.insurerEmail,
    };

    return NextResponse.json({
      success: true,
      extracted,
      message: "Document processed. Please review and fill in any missing information manually.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process document";
    console.error("Error in document extraction:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

