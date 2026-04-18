import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { create } from "@/lib/db";

export const runtime = "nodejs";

function generateReferenceId(count: number): string {
  const year = new Date().getFullYear();
  return `HV-${year}-${String(count + 1).padStart(6, "0")}`;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Normalize to XXX-XXX-XXXX for 10-digit US numbers */
function normalizeUsPhone(input: string): string | null {
  const d = digitsOnly(input);
  if (d.length !== 10) return null;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

function buildInsuredLegalName(first: string, middle: string, last: string): string {
  return [first, middle, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * POST /api/submit-policy — public policy document registry intake
 * Returns { reference_id, receipt_token }
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const insured_first_name = String(form.get("insured_first_name") || "").trim();
    const insured_middle_name = String(form.get("insured_middle_name") || "").trim();
    const insured_last_name = String(form.get("insured_last_name") || "").trim();
    const dob = String(form.get("dob") || "");
    const contact_phone_raw = String(form.get("contact_phone") || "").trim();
    const submitted_by_email = String(form.get("submitted_by_email") || "").trim().toLowerCase();
    const submitted_by_phone_raw = String(form.get("submitted_by_phone") || "").trim();
    const id_last_four = String(form.get("id_last_four") || "").trim();
    const dl_number = String(form.get("dl_number") || "").trim();
    const policy_number = String(form.get("policy_number") || "").trim();
    const carrier = String(form.get("carrier") || "").trim();
    const carrier_phone_raw = String(form.get("carrier_phone") || "").trim();
    const carrier_street = String(form.get("carrier_street") || "").trim();
    const carrier_city = String(form.get("carrier_city") || "").trim();
    const carrier_state = String(form.get("carrier_state") || "").trim().toUpperCase();
    const carrier_zip = String(form.get("carrier_zip") || "").trim();
    const acknowledged = String(form.get("acknowledged_disclaimer") || "");

    if (!insured_first_name || !insured_last_name) {
      return NextResponse.json({ error: "Insured first and last name are required." }, { status: 400 });
    }

    const contact_phone = normalizeUsPhone(contact_phone_raw);
    if (!contact_phone) {
      return NextResponse.json(
        { error: "Insured phone must be 10 digits (US), formatted as XXX-XXX-XXXX." },
        { status: 400 }
      );
    }

    const submitted_by_phone = submitted_by_phone_raw ? normalizeUsPhone(submitted_by_phone_raw) : null;
    if (submitted_by_phone_raw && !submitted_by_phone) {
      return NextResponse.json(
        { error: "Your phone must be 10 digits (US), formatted as XXX-XXX-XXXX." },
        { status: 400 }
      );
    }

    if (!submitted_by_email) {
      return NextResponse.json({ error: "Your email address is required." }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(submitted_by_email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (!/^\d{4}$/.test(id_last_four) && !dl_number) {
      return NextResponse.json(
        { error: "Provide either the last 4 digits of the insured's SSN or their full driver's license number." },
        { status: 400 }
      );
    }
    if (id_last_four && !/^\d{4}$/.test(id_last_four)) {
      return NextResponse.json({ error: "SSN last four must be exactly 4 digits." }, { status: 400 });
    }
    if (dl_number && !/^[A-Za-z0-9*\-]{5,24}$/.test(dl_number)) {
      return NextResponse.json({ error: "Driver license number format is invalid." }, { status: 400 });
    }

    if (!policy_number) {
      return NextResponse.json({ error: "Policy number is required." }, { status: 400 });
    }

    if (!carrier) {
      return NextResponse.json({ error: "Insurance company (carrier) name is required." }, { status: 400 });
    }

    const carrier_phone = normalizeUsPhone(carrier_phone_raw);
    if (!carrier_phone) {
      return NextResponse.json(
        { error: "Company phone is required (10-digit US number, formatted as XXX-XXX-XXXX)." },
        { status: 400 }
      );
    }

    if (!carrier_street || !carrier_city || !carrier_state || !carrier_zip) {
      return NextResponse.json(
        { error: "Company street, city, state, and ZIP are required." },
        { status: 400 }
      );
    }
    if (!/^[A-Z]{2}$/.test(carrier_state)) {
      return NextResponse.json({ error: "Company state must be a 2-letter US code." }, { status: 400 });
    }
    if (!/^\d{5}(-\d{4})?$/.test(carrier_zip)) {
      return NextResponse.json({ error: "Company ZIP must be 5 digits or ZIP+4." }, { status: 400 });
    }

    if (acknowledged !== "on" && acknowledged !== "true" && acknowledged !== "1") {
      return NextResponse.json({ error: "You must acknowledge the registry disclaimer before submitting." }, { status: 400 });
    }

    const insured_name = buildInsuredLegalName(insured_first_name, insured_middle_name, insured_last_name);

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
    }
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 50MB limit." }, { status: 400 });
    }

    const { count, error: countError } = await supabaseAdmin
      .from("policy_submissions")
      .select("*", { count: "exact", head: true });
    if (countError) console.error("Error counting submissions:", countError);

    const reference_id = generateReferenceId(count ?? 0);
    const receipt_token = randomUUID();

    const bytes = new Uint8Array(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const file_path = `submissions/${reference_id}/${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("policy-submissions")
      .upload(file_path, bytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file. Please try again." }, { status: 500 });
    }

    const submissionId = randomUUID();

    const row: Record<string, unknown> = {
      id: submissionId,
      reference_id,
      receipt_token,
      insured_name,
      insured_first_name,
      insured_middle_name: insured_middle_name || null,
      insured_last_name,
      dob: dob || null,
      contact_phone,
      submitted_by_phone,
      id_last_four: id_last_four || null,
      dl_number: dl_number || null,
      carrier,
      carrier_phone,
      carrier_street,
      carrier_city,
      carrier_state,
      carrier_zip,
      policy_number,
      submitted_by_email,
      file_path,
      source: "web",
      status: "received",
      created_at: new Date().toISOString(),
    };

    try {
      await create("policy_submissions", row);
    } catch (dbError: unknown) {
      await supabaseAdmin.storage.from("policy-submissions").remove([file_path]).catch(() => {});
      console.error("Database insert error:", dbError);
      return NextResponse.json(
        {
          error:
            "Failed to save submission. If you recently deployed, apply the latest database migration for policy submissions.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ reference_id, receipt_token }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Policy submission error:", errorMessage);
    return NextResponse.json({ error: "An error occurred processing your submission." }, { status: 500 });
  }
}
