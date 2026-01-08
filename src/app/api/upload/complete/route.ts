import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { fileAssetId } = await req.json();
  if (!fileAssetId) return new NextResponse("Missing fileAssetId", { status: 400 });

  const { update: updateFileAsset } = await import("@/lib/db");
  await updateFileAsset("client_file_assets", { id: fileAssetId }, {
    status: "UPLOADED",
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>);

  return NextResponse.json({ ok: true });
}
