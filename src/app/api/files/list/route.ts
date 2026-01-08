import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember } from "@/lib/authz";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * List files by org and optionally by registry/policy
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orgId = String(url.searchParams.get("orgId") || "").trim();
    const registryId = String(url.searchParams.get("registryId") || "").trim();

    if (!orgId) {
      return NextResponse.json(
        { ok: false, message: "Missing orgId." },
        { status: 400 }
      );
    }

    await requireOrgMember(orgId);

    const { findMany: findManyFiles } = await import("@/lib/db");
    
    type FileAssetRecord = {
      id: string;
      originalName: string;
      mimeType: string;
      byteSize: number;
      category: string | null;
      createdAt: string;
    };
    
    const where: Record<string, unknown> = { orgId };
    if (registryId) {
      where.registryId = registryId;
    }
    
    const files = await findManyFiles<FileAssetRecord>("file_assets", {
      where,
      orderBy: { column: "createdAt", ascending: false },
    });

    return NextResponse.json({
      ok: true,
      files: files.map((f) => ({
        id: f.id,
        originalName: f.originalName,
        mimeType: f.mimeType,
        byteSize: f.byteSize,
        category: f.category,
        createdAt: typeof f.createdAt === 'string' ? f.createdAt : new Date(f.createdAt).toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error in files list route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = error instanceof Error && (error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN")
      ? error.message === "UNAUTHENTICATED" ? 401 : 403
      : 500;
    return NextResponse.json(
      { ok: false, message },
      { status }
    );
  }
}
