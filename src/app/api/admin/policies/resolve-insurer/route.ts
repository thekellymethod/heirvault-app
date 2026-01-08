import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
;
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/admin/policies/resolve-insurer
 * Resolve an unresolved insurer by finding or creating an insurer record
 * and linking it to a policy
 */
export async function POST(req: Request) {
  const actor = await requireAdmin();

  let body: { policyId: string, insurerName: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.policyId || !body.insurerName) {
    return NextResponse.json(
      { ok: false, error: "policyId and insurerName are required" },
      { status: 400 }
    );
  }

  const { findUnique: findUniquePolicy, findMany: findManyInsurers, create: createInsurer, update: updatePolicy, create: createAudit } = await import("@/lib/db");
  
  // Find the policy
  const policy = await findUniquePolicy<{
    id: string;
    clientId: string;
    insurerId: string | null;
    carrierNameRaw: string | null;
  }>("policies", { id: body.policyId });

  if (!policy) {
    return NextResponse.json({ ok: false, error: "Policy not found" }, { status: 404 });
  }

  // Find or create insurer by exact name match
  const insurers = await findManyInsurers("insurers", {
    where: { name: body.insurerName.trim() },
    limit: 1,
  });
  
  let insurer = insurers && insurers.length > 0 ? (insurers[0] as { id: string; name: string }) : null;

  if (!insurer) {
    // Create new insurer
    const insurerId = randomUUID();
    const now = new Date().toISOString();
    insurer = await createInsurer("insurers", {
      id: insurerId,
      name: body.insurerName.trim(),
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>) as { id: string; name: string };
  }

  // Update policy to link to insurer
  // Keep carrier_name_raw for provenance
  await updatePolicy("policies", { id: body.policyId }, {
    insurerId: insurer.id,
    updatedAt: new Date().toISOString(),
    // carrier_name_raw remains for audit trail
  } as Record<string, unknown>);

  // Audit log
  const { logAuditEvent } = await import("@/lib/audit");
  await logAuditEvent({
    userId: actor.id,
    action: "POLICY_UPDATED",
    metadata: {
      policyId: body.policyId,
      insurerId: insurer.id,
      insurerName: insurer.name,
      message: `Resolved insurer for policyId=${body.policyId} to insurerId=${insurer.id}, name=${insurer.name}`,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      policyId: body.policyId,
      insurer: {
        id: insurer.id,
        name: insurer.name,
      },
    },
  });
}

