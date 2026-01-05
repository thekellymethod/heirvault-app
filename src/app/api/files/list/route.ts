import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

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

    const files = await prisma.fileAsset.findMany({
      where: {
        orgId,
        ...(registryId ? { registryId } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        byteSize: true,
        category: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      files: files.map((f) => ({
        id: f.id,
        originalName: f.originalName,
        mimeType: f.mimeType,
        byteSize: f.byteSize,
        category: f.category,
        createdAt: f.createdAt.toISOString(),
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
