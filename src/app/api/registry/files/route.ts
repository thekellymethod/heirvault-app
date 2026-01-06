import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const registryId = url.searchParams.get("registryId");

  if (!registryId) return new NextResponse("Missing registryId", { status: 400 });

  const files = await prisma.clientFileAsset.findMany({
    where: { registryId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ files });
}
