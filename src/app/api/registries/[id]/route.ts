import { NextRequest, NextResponse } from "next/server";
import { requireRegistryAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Get registry detail
 */
export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { registry } = await requireRegistryAccess(id);

    const full = await prisma.registry.findUnique({
      where: { id: registry.id },
      select: {
        id: true,
        orgId: true,
        name: true,
        status: true,
        createdAt: true,
        archivedAt: true,
        policies: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

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

    if (action === "archive") {
      await prisma.registry.update({
        where: { id: registry.id },
        data: { status: "archived", archivedAt: new Date() },
      });
      await prisma.auditLog.create({
        data: {
          orgId: registry.orgId,
          registryId: registry.id,
          actorClerkUserId: userId,
          action: "registry_archive",
          targetType: "registry",
          targetId: registry.id,
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "restore") {
      await prisma.registry.update({
        where: { id: registry.id },
        data: { status: "active", archivedAt: null },
      });
      await prisma.auditLog.create({
        data: {
          orgId: registry.orgId,
          registryId: registry.id,
          actorClerkUserId: userId,
          action: "registry_restore",
          targetType: "registry",
          targetId: registry.id,
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
      await prisma.registry.update({
        where: { id: registry.id },
        data: { name },
      });
      await prisma.auditLog.create({
        data: {
          orgId: registry.orgId,
          registryId: registry.id,
          actorClerkUserId: userId,
          action: "registry_rename",
          targetType: "registry",
          targetId: registry.id,
          meta: { name },
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
