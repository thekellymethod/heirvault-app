import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { create } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Generate a unique reference ID in format: HV-YYYY-NNNNNN
 * Example: HV-2026-000001
 */
function generateReferenceId(count: number): string {
  const year = new Date().getFullYear();
  return `HV-${year}-${String(count + 1).padStart(6, "0")}`;
}

/**
 * POST /api/submit-policy
 * 
 * Public endpoint for policy submission via web form.
 * Accepts form data with insured information and PDF file upload.
 * 
 * Returns: { reference_id: string }
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // Extract form fields
    const insured_name = String(form.get("insured_name") || "").trim();
    const dob = String(form.get("dob") || "");
    const carrier = String(form.get("carrier") || "").trim();
    const policy_number = String(form.get("policy_number") || "").trim();
    const submitted_by_email = String(form.get("submitted_by_email") || "").trim().toLowerCase();

    // Validate required fields
    if (!insured_name) {
      return NextResponse.json(
        { error: "Insured name is required." },
        { status: 400 }
      );
    }

    if (!submitted_by_email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(submitted_by_email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    // Get and validate file
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted." },
        { status: 400 }
      );
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit." },
        { status: 400 }
      );
    }

    // Get current count for reference ID generation
    const { count, error: countError } = await supabaseAdmin
      .from("policy_submissions")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error counting submissions:", countError);
      // Continue with count = 0 if query fails
    }

    const reference_id = generateReferenceId(count ?? 0);

    // Upload file to Supabase Storage
    const bytes = new Uint8Array(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const file_path = `submissions/${reference_id}/${safeName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("policy-submissions")
      .upload(file_path, bytes, {
        contentType: "application/pdf",
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file. Please try again." },
        { status: 500 }
      );
    }

    // Insert submission record into database
    const { randomUUID } = await import("crypto");
    const submissionId = randomUUID();

    try {
      await create("policy_submissions", {
        id: submissionId,
        reference_id,
        insured_name,
        dob: dob || null,
        carrier: carrier || null,
        policy_number: policy_number || null,
        submitted_by_email,
        file_path,
        source: "web",
        status: "received",
        created_at: new Date().toISOString(),
      } as Record<string, unknown>);
    } catch (dbError: unknown) {
      // If database insert fails, try to clean up uploaded file
      await supabaseAdmin.storage
        .from("policy-submissions")
        .remove([file_path])
        .catch(() => {
          // Ignore cleanup errors
        });

      console.error("Database insert error:", dbError);
      return NextResponse.json(
        { error: "Failed to save submission. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { reference_id },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Policy submission error:", errorMessage);
    return NextResponse.json(
      { error: "An error occurred processing your submission." },
      { status: 500 }
    );
  }
}
