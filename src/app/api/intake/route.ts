import { NextResponse } from "next/server";
import { createRegistryRecord, appendRegistryVersion, addDocumentRow } from "@/lib/db";
import { sha256String } from "@/lib/hash";
import { uploadDocument } from "@/lib/storage";
import { signToken } from "@/lib/qr";
import { logAccess } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const insured_name = String(form.get("insured_name") ?? "").trim();
    const carrier_guess = String(form.get("carrier_guess") ?? "").trim() || null;

    const policyholder_name = String(form.get("policyholder_name") ?? "").trim();
    const beneficiary_name = String(form.get("beneficiary_name") ?? "").trim();
    const policy_number_optional = String(form.get("policy_number_optional") ?? "").trim();
    const notes_optional = String(form.get("notes_optional") ?? "").trim();

    if (!insured_name) {
      return NextResponse.json({ error: "insured_name is required" }, { status: 400 });
    }

    const registry = await createRegistryRecord({ insured_name, carrier_guess });

    const data_json = {
      insured_name,
      carrier_guess,
      policyholder_name: policyholder_name || null,
      beneficiary_name: beneficiary_name || null,
      policy_number_optional: policy_number_optional || null,
      notes_optional: notes_optional || null,
    };

    const versionHash = await sha256String(JSON.stringify(data_json));
    const version = await appendRegistryVersion({
      registry_id: registry.id,
      submitted_by: "INTAKE",
      data_json,
      hash: versionHash,
    });

    // Optional file upload
    const file = form.get("document");
    if (file && file instanceof File && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const uploaded = await uploadDocument({
        fileBuffer: arrayBuffer,
        filename: file.name || "document",
        contentType: file.type || "application/octet-stream",
      });

      await addDocumentRow({
        registry_version_id: version.id,
        storage_path: uploaded.storagePath,
        content_type: file.type || "application/octet-stream",
        size_bytes: uploaded.sizeBytes,
        sha256: uploaded.sha256,
      });

      await logAccess({
        userId: null,
        registryId: registry.id,
        action: "DOCUMENT_UPLOADED",
        metadata: { source: "INTAKE", contentType: file.type, size: file.size },
      });
    }

    await logAccess({
      userId: null,
      registryId: registry.id,
      action: "INTAKE_SUBMITTED",
      metadata: { carrier_guess, insured_name },
    });

    const updateToken = signToken({ registryId: registry.id, purpose: "update" }, 60 * 60 * 24 * 365); // 1 year

    return NextResponse.json({
      receiptId: version.id,
      registryId: registry.id,
      updateToken,
      updateUrl: `/update/${updateToken}`,
      createdAt: version.created_at,
      confirmationMessage: "Submission received and recorded.",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: "intake_failed", details: message },
      { status: 500 }
    );
  }
}
