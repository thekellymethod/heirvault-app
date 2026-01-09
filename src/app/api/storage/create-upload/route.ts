import { NextResponse } from "next/server";
import { requireOrgMember } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/**
 * Create signed upload URL for file upload
 * 
 * This endpoint:
 * - Verifies org membership
 * - Creates a FileAsset row (Prisma) first (so we have fileId)
 * - Returns a signed upload URL to the browser
 * - The browser uploads directly to Supabase Storage
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const orgId = String(body?.orgId ?? "").trim();
    const registryId = body?.registryId ? String(body.registryId).trim() : null;
    const category = String(body?.category ?? "uploads").trim();

    const originalName = String(body?.originalName ?? "").trim();
    const mimeType = String(body?.mimeType ?? "application/octet-stream").trim();
    const byteSize = Number(body?.byteSize ?? 0);

    if (!orgId || !originalName || !Number.isFinite(byteSize) || byteSize <= 0) {
      return NextResponse.json(
        { ok: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    const { userId } = await requireOrgMember(orgId);

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "heirvault-files";

    const { create: createFileAsset, update: updateFileAsset, deleteRecord: deleteFileAsset } = await import("@/lib/db");
    const { randomUUID } = await import("crypto");
    
    // Create DB record first so we have a stable fileId
    const fileId = randomUUID();
    const now = new Date().toISOString();
    const created = await createFileAsset("file_assets", {
      id: fileId,
      orgId,
      registryId: registryId || null,
      policyId: body?.policyId ? String(body.policyId).trim() : null,
      bucket,
      storagePath: "TEMP",
      originalName,
      mimeType,
      byteSize: Math.max(0, Math.floor(byteSize)),
      category,
      uploadedByClerkUserId: userId,
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>) as { id: string };

    const ext = (originalName.split(".").pop() || "").slice(0, 8);
    const base = slugify(originalName.replace(/\.[^/.]+$/, ""));
    const safeExt = ext ? `.${ext}` : "";

    const path = `orgs/${orgId}/registries/${registryId || "unassigned"}/${category}/${created.id}-${base}${safeExt}`;

    await updateFileAsset("file_assets", { id: created.id }, {
      storagePath: path,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);

    // Signed upload URL (10 minutes)
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);

    if (error || !data?.signedUrl) {
      // Clean up DB record if upload URL creation fails
      await deleteFileAsset("file_assets", { id: created.id }).catch(() => {});
      return NextResponse.json(
        { ok: false, message: "Failed to create signed upload URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      fileId: created.id,
      bucket,
      path,
      signedUrl: data.signedUrl,
    });
  } catch (error) {
    console.error("Error in create-upload route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}
