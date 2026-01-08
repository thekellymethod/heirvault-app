import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * List files by org and optionally by registry/policy
 * 
 * GET /api/files?orgId=xxx&registryId=yyy&policyId=zzz
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const orgId = searchParams.get("orgId")?.trim();
    const registryId = searchParams.get("registryId")?.trim() || undefined;
    const policyId = searchParams.get("policyId")?.trim() || undefined;

    if (!orgId) {
      return NextResponse.json(
        { ok: false, message: "Missing orgId." },
        { status: 400 }
      );
    }

    // Membership check
    const { findMany: findManyFiles, getDb } = await import("@/lib/db");
    
    const db = getDb();
    const { data: membersData } = await db
      .from("org_members")
      .select("*")
      .eq("orgId", orgId)
      .eq("clerkUserId", userId)
      .limit(1);
    
    if (!membersData || membersData.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    // Build where clause
    type FileAssetRecord = {
      id: string;
      originalName: string;
      mimeType: string;
      byteSize: number;
      createdAt: string;
      registryId: string | null;
      policyId: string | null;
    };
    
    const where: Record<string, unknown> = { orgId };
    if (registryId) {
      where.registryId = registryId;
    }
    if (policyId) {
      where.policyId = policyId;
    }

    // Fetch files
    const files = await findManyFiles<FileAssetRecord>("file_assets", {
      where,
      orderBy: { column: "createdAt", ascending: false },
    });

    return NextResponse.json({
      ok: true,
      files: files.map((f) => ({
        fileId: f.id,
        originalName: f.originalName,
        mimeType: f.mimeType,
        byteSize: f.byteSize,
        createdAt: typeof f.createdAt === 'string' ? f.createdAt : new Date(f.createdAt).toISOString(),
        registryId: f.registryId,
        policyId: f.policyId,
      })),
    });
  } catch (error) {
    console.error("Error in files list route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}
