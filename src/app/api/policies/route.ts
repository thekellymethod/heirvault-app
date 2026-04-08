import { NextRequest, NextResponse } from "next/server";
import { requireRegistryAccess } from "@/lib/authz";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RegistryRecord = {
  id: string;
  org_id: string;
  [key: string]: unknown;
};

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
    const registryTyped = registry as RegistryRecord;

    const { findMany } = await import("@/lib/db");
    const policies = await findMany("policies", {
      where: { registryId: registryTyped.id },
      orderBy: { column: "createdAt", ascending: false },
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
    const registryTyped = registry as RegistryRecord;
    const { create: createDb } = await import("@/lib/db");
    const { randomUUID: uuid } = await import("crypto");

    const policyId = uuid();
    const policy = await createDb("policies", {
      id: policyId,
      orgId: registryTyped.org_id,
      registryId: registryTyped.id,
      carrier: body?.carrier?.trim() || null,
      policyNumber: body?.policyNumber?.trim() || null,
      insuredName: body?.insuredName?.trim() || null,
      ownerName: body?.ownerName?.trim() || null,
      beneficiary: body?.beneficiary?.trim() || null,
      faceAmount: body?.faceAmount ? body.faceAmount : null,
      status: body?.status || "unknown",
      notes: body?.notes?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create audit log
    const { logAuditEvent } = await import("@/lib/audit");
    await logAuditEvent({
      userId: userId,
      action: "policy_create",
      metadata: {
        orgId: registryTyped.org_id,
        registryId: registryTyped.id,
        targetType: "policy",
        targetId: (policy as { id: string }).id,
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
