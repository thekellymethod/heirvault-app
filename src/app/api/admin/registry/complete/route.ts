import { NextResponse } from "next/server";
// Prisma removed - database access needs to be implemented
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildRegistrySummaryPdfBytes } from "@/lib/pdf/registrySummary";
import { sendCompletionEmail } from "@/lib/email";

function requireAdmin(req: Request) {
  const token = req.headers.get("x-admin-token");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    throw new Error("Unauthorized");
  }
}

export async function POST(req: Request) {
  try {
    requireAdmin(req);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { registryId } = await req.json();
  if (!registryId) return new NextResponse("Missing registryId", { status: 400 });

  const { findUnique: findUniqueRegistry, findMany: findManyFiles } = await import("@/lib/db");
  
  type RegistryRecord = {
    id: string;
    clientName: string | null;
    clientEmail: string;
  };
  
  type FileRecord = {
    originalName: string;
    status: string;
    createdAt: string;
  };
  
  const registry = await findUniqueRegistry<RegistryRecord>("client_registries", { id: registryId });
  if (!registry) return new NextResponse("Registry not found", { status: 404 });
  
  // Fetch files separately
  const files = await findManyFiles<FileRecord>("client_file_assets", {
    where: { registryId },
    orderBy: { column: "createdAt", ascending: false },
  });

  // Build PDF
  const pdfBytes = await buildRegistrySummaryPdfBytes({
    registryId: registry.id,
    clientName: registry.clientName ?? "",
    clientEmail: registry.clientEmail,
    completedAt: new Date(),
    files: (files || []).map((f) => ({
      originalName: f.originalName,
      status: f.status,
      createdAt: new Date(f.createdAt),
    })),
  });

  // Upload to Supabase storage
  const bucket = "heirvault-registry";
  const path = `registries/${registryId}/summary/registry-summary.pdf`;

  // Convert Uint8Array to Buffer for Supabase upload
  const pdfBuffer = Buffer.from(pdfBytes);

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return new NextResponse(`Storage upload failed: ${uploadError.message}`, { status: 500 });
  }

  // Mark complete and store PDF reference
  const { update: updateRegistry } = await import("@/lib/db");
  await updateRegistry("client_registries", { id: registryId }, {
    status: "COMPLETE",
    completedAt: new Date().toISOString(),
    summaryBucket: bucket,
    summaryPath: path,
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>);

  // Generate signed URL for client email (valid for 30 days)
  const { data: urlData, error: urlError } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 30); // 30 days

  // Send completion email with PDF link
  if (!urlError && urlData?.signedUrl) {
    try {
      await sendCompletionEmail({
        to: registry.clientEmail,
        clientName: registry.clientName ?? undefined,
        registryId: registry.id,
        summaryPdfUrl: urlData.signedUrl,
      });
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error("Failed to send completion email:", emailError);
    }
  }

  return NextResponse.json({ ok: true, bucket, path, emailSent: !urlError && !!urlData?.signedUrl });
}
