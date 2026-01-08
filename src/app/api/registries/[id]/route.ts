import { NextRequest, NextResponse } from "next/server";
import { requireRegistryAccess } from "@/lib/authz";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Get registry detail
 */
export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { registry } = await requireRegistryAccess(id);

    const { findUnique: findUniqueRegistry, findMany: findManyPolicies } = await import("@/lib/db");
    
    type RegistryRecord = {
      id: string;
      orgId: string;
      name: string;
      status: string;
      createdAt: string;
      archivedAt: string | null;
    };
    
    const fullRegistry = await findUniqueRegistry<RegistryRecord>("registries", { id: registry.id });
    
    if (!fullRegistry) {
      return NextResponse.json(
        { ok: false, message: "Registry not found." },
        { status: 404 }
      );
    }
    
    // Fetch policies separately
    const policies = await findManyPolicies("policies", {
      where: { registryId: registry.id },
      orderBy: { column: "createdAt", ascending: false },
    });
    
    const full = {
      ...fullRegistry,
      policies: policies || [],
    };

    if (!full) {
      return NextResponse.json(
        { ok: false, message: "Registry not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, registry: full });
  } catch (error) {
    console.error("Error in registry GET route:", error);
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
 * Update registry (archive, restore, rename)
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { userId, registry } = await requireRegistryAccess(id);
    const body = await req.json().catch(() => null);
    const action = String(body?.action ?? "").trim(); // "archive" | "restore" | "rename"
    const name = String(body?.name ?? "").trim();

    const { update: updateRegistry, create: createAudit, randomUUID } = await import("@/lib/db");
    const { randomUUID: cryptoRandomUUID } = await import("crypto");
    
    if (action === "archive") {
      await updateRegistry("registries", { id: registry.id }, {
        status: "archived",
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
      await createAudit("audit_logs", {
        id: cryptoRandomUUID(),
        orgId: registry.orgId,
        registryId: registry.id,
        actorClerkUserId: userId,
        action: "registry_archive",
        targetType: "registry",
        targetId: registry.id,
        createdAt: new Date().toISOString(),
      } as Record<string, unknown>);
      return NextResponse.json({ ok: true });
    }

    if (action === "restore") {
      await updateRegistry("registries", { id: registry.id }, {
        status: "active",
        archivedAt: null,
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
      await createAudit("audit_logs", {
        id: cryptoRandomUUID(),
        orgId: registry.orgId,
        registryId: registry.id,
        actorClerkUserId: userId,
        action: "registry_restore",
        targetType: "registry",
        targetId: registry.id,
        createdAt: new Date().toISOString(),
      } as Record<string, unknown>);
      return NextResponse.json({ ok: true });
    }

    if (action === "rename") {
      if (!name) {
        return NextResponse.json(
          { ok: false, message: "Missing name." },
          { status: 400 }
        );
      }
      await updateRegistry("registries", { id: registry.id }, {
        name,
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
      await createAudit("audit_logs", {
        id: cryptoRandomUUID(),
        orgId: registry.orgId,
        registryId: registry.id,
        actorClerkUserId: userId,
        action: "registry_rename",
        targetType: "registry",
        targetId: registry.id,
        meta: { name },
        createdAt: new Date().toISOString(),
      } as Record<string, unknown>);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, message: "Unknown action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in registry PATCH route:", error);
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
