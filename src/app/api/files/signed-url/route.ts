import { NextResponse } from "next/server";
import { requireOrgMember } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Generate signed download/preview URL (secure access)
 * 
 * Never expose raw storage paths publicly. Instead: generate a signed URL
 * only if the user is a member of the org that owns the file.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const orgId = String(body?.orgId ?? "").trim();
    const fileId = String(body?.fileId ?? "").trim();

    if (!orgId || !fileId) {
      return NextResponse.json(
        { ok: false, message: "Missing orgId or fileId." },
        { status: 400 }
      );
    }

    await requireOrgMember(orgId);

    const { findUnique: findUniqueFile } = await import("@/lib/db");
    
    type FileAssetRecord = {
      id: string;
      orgId: string;
      bucket: string;
      storagePath: string;
    };
    
    const file = await findUniqueFile<FileAssetRecord>("file_assets", { id: fileId });

    if (!file || file.orgId !== orgId) {
      return NextResponse.json(
        { ok: false, message: "File not found." },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin.storage
      .from(file.bucket)
      .createSignedUrl(file.storagePath, 60 * 10); // 10 min

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { ok: false, message: "Failed to create signed URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      signedUrl: data.signedUrl,
    });
  } catch (error) {
    console.error("Error in signed-url route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}
