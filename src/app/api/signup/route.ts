import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Signup route: Create Org + OrgMember + first Registry
 * This is called after Clerk authentication is complete
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const firmName = String(body?.firmName ?? "").trim();
    const estateName = String(body?.estateName ?? "").trim();

    if (!firmName || !estateName) {
      return NextResponse.json(
        { ok: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    // Create org + member + first registry in a transaction
    const { transaction, create: createDb } = await import("@/lib/db");
    const { randomUUID } = await import("crypto");
    
    const result = await transaction(async () => {
      const orgId = randomUUID();
      const now = new Date().toISOString();
      
      // Create organization
      const org = await createDb("organizations", {
        id: orgId,
        name: firmName,
        createdByClerkUserId: userId,
        includedActiveRegistries: 5,
        billingPlan: "FREE",
        createdAt: now,
        updatedAt: now,
      } as Record<string, unknown>) as { id: string };

      // Create org member
      await createDb("org_members", {
        id: randomUUID(),
        orgId: org.id,
        clerkUserId: userId,
        role: "OWNER",
        createdAt: now,
        updatedAt: now,
      } as Record<string, unknown>);

      // Create registry
      const registryId = randomUUID();
      const registry = await createDb("registries", {
        id: registryId,
        orgId: org.id,
        name: estateName,
        status: "active",
        createdAt: now,
        updatedAt: now,
      } as Record<string, unknown>) as { id: string };

      // Audit log
      await createDb("audit_logs", {
        id: randomUUID(),
        orgId: org.id,
        registryId: registry.id,
        actorClerkUserId: userId,
        action: "signup_create_org_registry",
        targetType: "registry",
        targetId: registry.id,
        createdAt: now,
      } as Record<string, unknown>);

      return { orgId: org.id, registryId: registry.id };
    });

    return NextResponse.json({
      ok: true,
      redirectTo: `/app/registries/${result.registryId}`,
      orgId: result.orgId,
      registryId: result.registryId,
    });
  } catch (error) {
    console.error("Error in signup route:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}
