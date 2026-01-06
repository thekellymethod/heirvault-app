import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { registryId, originalName, mimeType, sizeBytes } = await req.json();
  if (!registryId || !originalName) return new NextResponse("Missing fields", { status: 400 });

  const bucket = "heirvault-registry";
  const safeName = originalName.replace(/[^\w.\- ]+/g, "_");
  const storagePath = `registries/${registryId}/incoming/${Date.now()}-${safeName}`;

  // Create DB record first
  const fileAsset = await prisma.clientFileAsset.create({
    data: {
      registryId,
      originalName,
      mimeType,
      sizeBytes,
      storageBucket: bucket,
      storagePath,
      status: "PENDING",
    },
  });

  // Signed upload URL
  // @ts-ignore - createSignedUploadUrl may not be in types but exists in runtime
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    await prisma.clientFileAsset.update({
      where: { id: fileAsset.id },
      data: { status: "FAILED" },
    });
    return new NextResponse("Failed to create upload URL", { status: 500 });
  }

  return NextResponse.json({
    fileAssetId: fileAsset.id,
    uploadUrl: data.signedUrl,
  });
}
