import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { db, insurers, policies, eq } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/admin/policies/resolve-insurer
 * Resolve an unresolved insurer by finding or creating an insurer record
 * and linking it to a policy
 */
export async function POST(req: Request) {
  const actor = await requireAdmin();

  let body: { policyId: string; insurerName: string };
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

  // Find the policy
  const policy = await prisma.policies.findUnique({
    where: { id: body.policyId },
    select: {
      id: true,
      client_id: true,
      insurer_id: true,
      carrier_name_raw: true,
    },
  });

  if (!policy) {
    return NextResponse.json({ ok: false, error: "Policy not found" }, { status: 404 });
  }

  // Find or create insurer by exact name match
  let insurer;
  const existingInsurer = await db
    .select()
    .from(insurers)
    .where(eq(insurers.name, body.insurerName.trim()))
    .limit(1);

  if (existingInsurer.length > 0) {
    insurer = existingInsurer[0];
  } else {
    // Create new insurer
    const [newInsurer] = await db
      .insert(insurers)
      .values({
        name: body.insurerName.trim(),
      })
      .returning();
    insurer = newInsurer;
  }

  // Update policy to link to insurer
  // Keep carrier_name_raw for provenance
  await prisma.policies.update({
    where: { id: body.policyId },
    data: {
      insurer_id: insurer.id,
      // carrier_name_raw remains for audit trail
    },
  });

  // Audit log
  await prisma.audit_logs.create({
    data: {
      id: crypto.randomUUID(),
      user_id: actor.id,
      action: "POLICY_UPDATED", // TODO: Add POLICY_INSURER_RESOLVED to AuditAction enum
      message: `Resolved insurer for policyId=${body.policyId} to insurerId=${insurer.id}, name=${insurer.name}`,
      created_at: new Date(),
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

