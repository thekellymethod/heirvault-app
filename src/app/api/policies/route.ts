import { NextRequest, NextResponse } from "next/server";
import { requireRegistryAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * List policies by registry
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const registryId = String(url.searchParams.get("registryId") || "").trim();
    
    if (!registryId) {
      return NextResponse.json(
        { ok: false, message: "Missing registryId." },
        { status: 400 }
      );
    }

    const { registry } = await requireRegistryAccess(registryId);

    const policies = await prisma.policy.findMany({
      where: { registryId: registry.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, policies });
  } catch (error) {
    console.error("Error in policies GET route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = error instanceof Error && (error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN" || error.message === "NOT_FOUND")
      ? error.message === "UNAUTHENTICATED" ? 401 : error.message === "FORBIDDEN" ? 403 : 404
      : 500;
    return NextResponse.json(
      { ok: false, message },
      { status }
    );
  }
}

/**
 * Create policy
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const registryId = String(body?.registryId ?? "").trim();
    
    if (!registryId) {
      return NextResponse.json(
        { ok: false, message: "Missing registryId." },
        { status: 400 }
      );
    }

    const { userId, registry } = await requireRegistryAccess(registryId);

    const policy = await prisma.policy.create({
      data: {
        orgId: registry.orgId,
        registryId: registry.id,
        carrier: body?.carrier?.trim() || null,
        policyNumber: body?.policyNumber?.trim() || null,
        insuredName: body?.insuredName?.trim() || null,
        ownerName: body?.ownerName?.trim() || null,
        beneficiary: body?.beneficiary?.trim() || null,
        faceAmount: body?.faceAmount ? body.faceAmount : null,
        status: body?.status || "unknown",
        notes: body?.notes?.trim() || null,
      },
      select: { id: true },
    });

    await prisma.auditLog.create({
      data: {
        orgId: registry.orgId,
        registryId: registry.id,
        actorClerkUserId: userId,
        action: "policy_create",
        targetType: "policy",
        targetId: policy.id,
      },
    });

    return NextResponse.json({ ok: true, policyId: policy.id });
  } catch (error) {
    console.error("Error in policies POST route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = error instanceof Error && (error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN" || error.message === "NOT_FOUND")
      ? error.message === "UNAUTHENTICATED" ? 401 : error.message === "FORBIDDEN" ? 403 : 404
      : 500;
    return NextResponse.json(
      { ok: false, message },
      { status }
    );
  }
}
