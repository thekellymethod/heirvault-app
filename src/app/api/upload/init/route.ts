import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { registryId, originalName, mimeType, sizeBytes } = await req.json();
  if (!registryId || !originalName) return new NextResponse("Missing fields", { status: 400 });

  const bucket = "heirvault-registry";
  const safeName = originalName.replace(/[^\w.\- ]+/g, "_");
  const storagePath = `registries/${registryId}/incoming/${Date.now()}-${safeName}`;

  // Create DB record first
  const { create: createFileAsset, update: updateFileAsset } = await import("@/lib/db");
  const { randomUUID } = await import("crypto");
  
  const fileAsset = await createFileAsset("client_file_assets", {
    id: randomUUID(),
    registryId,
    originalName,
    mimeType,
    sizeBytes,
    storageBucket: bucket,
    storagePath,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>) as { id: string };

  // Signed upload URL
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    await updateFileAsset("client_file_assets", { id: fileAsset.id }, {
      status: "FAILED",
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);
    return new NextResponse("Failed to create upload URL", { status: 500 });
  }

  return NextResponse.json({
    fileAssetId: fileAsset.id,
    uploadUrl: data.signedUrl,
  });
}
