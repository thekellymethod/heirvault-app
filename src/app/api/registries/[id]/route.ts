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
    const accessResult = await requireRegistryAccess(id);
    const registry = accessResult.registry as { id: string; org_id: string };

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
    const accessResult = await requireRegistryAccess(id);
    const userId = accessResult.userId;
    const registry = accessResult.registry as { id: string; org_id: string };
    const body = await req.json().catch(() => null);
    const action = String(body?.action ?? "").trim(); // "archive" | "restore" | "rename"
    const name = String(body?.name ?? "").trim();

    const { update: updateRegistry } = await import("@/lib/db");
    const { logAuditEvent } = await import("@/lib/audit");
    const { findUnique: findUniqueUser } = await import("@/lib/db");
    
    // Get user ID for audit log
    const user = await findUniqueUser<{ id: string }>("users", { clerkId: userId });
    const dbUserId = user?.id || null;
    
    if (action === "archive") {
      await updateRegistry("registries", { id: registry.id }, {
        status: "archived",
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
      await logAuditEvent({
        userId: dbUserId,
        action: "registry_archive",
        metadata: {
          registryId: registry.id,
          orgId: registry.org_id,
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "restore") {
      await updateRegistry("registries", { id: registry.id }, {
        status: "active",
        archivedAt: null,
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>);
      await logAuditEvent({
        userId: dbUserId,
        action: "registry_restore",
        metadata: {
          registryId: registry.id,
          orgId: registry.org_id,
        },
      });
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
      await logAuditEvent({
        userId: dbUserId,
        action: "registry_rename",
        metadata: {
          registryId: registry.id,
          orgId: registry.org_id,
          name,
        },
      });
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
