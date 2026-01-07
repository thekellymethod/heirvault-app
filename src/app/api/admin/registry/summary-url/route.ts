import { NextResponse } from "next/server";
// Prisma removed - database access needs to be implemented
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function requireAdmin(req: Request) {
  const token = req.headers.get("x-admin-token");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    throw new Error("Unauthorized");
  }
}

export async function GET(req: Request) {
  try {
    requireAdmin(req);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const registryId = url.searchParams.get("registryId");
  if (!registryId) return new NextResponse("Missing registryId", { status: 400 });

  const registry = await prisma.clientRegistry.findUnique({
    where: { id: registryId },
    select: { summaryBucket: true, summaryPath: true },
  });

  if (!registry?.summaryBucket || !registry.summaryPath) {
    return new NextResponse("No summary PDF available", { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(registry.summaryBucket)
    .createSignedUrl(registry.summaryPath, 60 * 10);

  if (error || !data?.signedUrl) {
    return new NextResponse("Failed to create signed URL", { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
