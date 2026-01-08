import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember } from "@/lib/authz";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAID = new Set(["trialing", "active"]);

/**
 * List registries for an org
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orgId = String(url.searchParams.get("orgId") || "").trim();
    
    if (!orgId) {
      return NextResponse.json(
        { ok: false, message: "Missing orgId." },
        { status: 400 }
      );
    }

    await requireOrgMember(orgId);

    const { findMany: findManyRegistries } = await import("@/lib/db");
    
    type RegistryRecord = {
      id: string;
      name: string;
      status: string;
      createdAt: string;
      archivedAt: string | null;
    };
    
    const regs = await findManyRegistries<RegistryRecord>("registries", {
      where: { orgId },
      orderBy: { column: "createdAt", ascending: false },
    });

    return NextResponse.json({ 
      ok: true, 
      registries: (regs || []).map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString(),
        archivedAt: r.archivedAt ? (typeof r.archivedAt === 'string' ? r.archivedAt : new Date(r.archivedAt).toISOString()) : null,
      }))
    });
  } catch (error) {
    console.error("Error in registries GET route:", error);
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

/**
 * Create registry (enforce cap)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const orgId = String(body?.orgId ?? "").trim();
    const name = String(body?.name ?? "").trim();

    if (!orgId || !name) {
      return NextResponse.json(
        { ok: false, message: "Missing fields." },
        { status: 400 }
      );
    }

    const { userId } = await requireOrgMember(orgId);

    const { findUnique: findUniqueOrg, count: countRegistries, create: createRegistry, create: createAudit } = await import("@/lib/db");
    const { randomUUID } = await import("crypto");
    
    type OrgRecord = {
      id: string;
      includedActiveRegistries: number;
      stripeSubscriptionStatus: string | null;
    };
    
    const org = await findUniqueOrg<OrgRecord>("organizations", { id: orgId });
    
    if (!org) {
      return NextResponse.json(
        { ok: false, message: "Org not found." },
        { status: 404 }
      );
    }

    const activeCount = await countRegistries("registries", {
      where: { orgId, status: "active" },
    });
    
    const over = activeCount >= org.includedActiveRegistries;
    const isPaid = org.stripeSubscriptionStatus && PAID.has(org.stripeSubscriptionStatus);

    if (over && !isPaid) {
      return NextResponse.json(
        {
          ok: false,
          code: "BILLING_REQUIRED",
          message: `You have ${activeCount} active registries. Included: ${org.includedActiveRegistries}. Add billing to create more.`,
          activeCount,
          included: org.includedActiveRegistries,
        },
        { status: 402 }
      );
    }

    const registryId = randomUUID();
    const now = new Date().toISOString();
    const registry = await createRegistry("registries", {
      id: registryId,
      orgId,
      name,
      status: "active",
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>) as { id: string };

    await createAudit("audit_logs", {
      id: randomUUID(),
      orgId,
      registryId: registry.id,
      actorClerkUserId: userId,
      action: "registry_create",
      targetType: "registry",
      targetId: registry.id,
      meta: { name },
      createdAt: now,
    } as Record<string, unknown>);

    return NextResponse.json({ ok: true, registryId: registry.id });
  } catch (error) {
    console.error("Error in registries POST route:", error);
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
