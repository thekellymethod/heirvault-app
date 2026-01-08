import { NextResponse } from "next/server";
// Prisma removed - database access needs to be implemented

export async function GET(req: Request) {
  const url = new URL(req.url);
  const registryId = url.searchParams.get("registryId");

  if (!registryId) return new NextResponse("Missing registryId", { status: 400 });

  const { findMany: findManyFiles } = await import("@/lib/db");
  const files = await findManyFiles("client_file_assets", {
    where: { registryId },
    orderBy: { column: "createdAt", ascending: false },
  });

  return NextResponse.json({ files });
}
