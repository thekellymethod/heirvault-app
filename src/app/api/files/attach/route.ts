import { NextResponse } from "next/server";
import { requireOrgMember } from "@/lib/authz";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Attach file to registry/policy (authoritative DB link)
 * 
 * After the upload finishes, the client calls this to attach file to a registry/policy
 * or just confirm the attachment.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const orgId = String(body?.orgId ?? "").trim();
    const fileId = String(body?.fileId ?? "").trim();
    const registryId = body?.registryId ? String(body.registryId).trim() : null;
    const policyId = body?.policyId ? String(body.policyId).trim() : null;

    if (!orgId || !fileId) {
      return NextResponse.json(
        { ok: false, message: "Missing orgId or fileId." },
        { status: 400 }
      );
    }

    await requireOrgMember(orgId);

    // Ensure the file belongs to this org and was created by your system
    const { findUnique: findUniqueFile, update: updateFile } = await import("@/lib/db");
    
    type FileAssetRecord = {
      id: string;
      orgId: string;
    };
    
    const file = await findUniqueFile<FileAssetRecord>("file_assets", { id: fileId });
    
    if (!file || file.orgId !== orgId) {
      return NextResponse.json(
        { ok: false, message: "File not found." },
        { status: 404 }
      );
    }

    // Attach
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (registryId) {
      updateData.registryId = registryId;
    }
    if (policyId) {
      updateData.policyId = policyId;
    }
    
    await updateFile("file_assets", { id: fileId }, updateData);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in attach route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}
