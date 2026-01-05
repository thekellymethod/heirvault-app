import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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
    const member = await prisma.orgMember.findUnique({
      where: { orgId_clerkUserId: { orgId, clerkUserId: userId } },
      select: { role: true },
    });
    
    if (!member) {
      return NextResponse.json(
        { ok: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    // Build where clause
    const where: any = {
      orgId,
    };

    if (registryId) {
      where.registryId = registryId;
    }

    if (policyId) {
      where.policyId = policyId;
    }

    // Fetch files
    const files = await prisma.fileAsset.findMany({
      where,
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        byteSize: true,
        createdAt: true,
        registryId: true,
        policyId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      ok: true,
      files: files.map((f) => ({
        fileId: f.id,
        originalName: f.originalName,
        mimeType: f.mimeType,
        byteSize: f.byteSize,
        createdAt: f.createdAt.toISOString(),
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
