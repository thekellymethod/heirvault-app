import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { fileAssetId } = await req.json();
  if (!fileAssetId) return new NextResponse("Missing fileAssetId", { status: 400 });

  await prisma.clientFileAsset.update({
    where: { id: fileAssetId },
    data: { status: "UPLOADED" },
  });

  return NextResponse.json({ ok: true });
}
