import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/qr";
import { appendRegistryVersion, addDocumentRow, getRegistryById } from "@/lib/db";
import { sha256String } from "@/lib/hash";
import { uploadDocument } from "@/lib/storage";
import { logAccess } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const token = String(form.get("token") ?? "").trim();
    if (!token) return NextResponse.json({ error: "token_required" }, { status: 400 });

    const vt = verifyToken(token);
    if (!vt.valid || !vt.payload) {
      return NextResponse.json({ error: "invalid_token", reason: vt.reason }, { status: 403 });
    }

    const registryId = vt.payload.registryId;
    const registry = await getRegistryById(registryId);
    if (!registry) return NextResponse.json({ error: "registry_not_found" }, { status: 404 });

    const insured_name = String(form.get("insured_name") ?? registry.insured_name).trim();
    const carrier_guess = String(form.get("carrier_guess") ?? registry.carrier_guess ?? "").trim() || null;

    const policyholder_name = String(form.get("policyholder_name") ?? "").trim();
    const beneficiary_name = String(form.get("beneficiary_name") ?? "").trim();
    const policy_number_optional = String(form.get("policy_number_optional") ?? "").trim();
    const notes_optional = String(form.get("notes_optional") ?? "").trim();

    const data_json = {
      insured_name,
      carrier_guess,
      policyholder_name: policyholder_name || null,
      beneficiary_name: beneficiary_name || null,
      policy_number_optional: policy_number_optional || null,
      notes_optional: notes_optional || null,
      update_source: "TOKEN",
    };

    const versionHash = await sha256String(JSON.stringify(data_json));
    const version = await appendRegistryVersion({
      registry_id: registryId,
      submitted_by: "TOKEN",
      data_json,
      hash: versionHash,
    });

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
        registryId,
        action: "DOCUMENT_UPLOADED",
        metadata: { source: "TOKEN", contentType: file.type, size: file.size },
      });
    }

    await logAccess({
      userId: null,
      registryId,
      action: "REGISTRY_UPDATED_BY_TOKEN",
      metadata: { insured_name, carrier_guess },
    });

    return NextResponse.json({
      receiptId: version.id,
      registryId,
      createdAt: version.created_at,
      confirmationMessage: "Update recorded successfully.",
    });
  } catch (e: unknown) {
  const message = e instanceof Error ? e.message : "Unknown error";
} {
    return NextResponse.json(
      { error: "update_failed", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
