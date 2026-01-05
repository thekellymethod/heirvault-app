import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

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

    const regs = await prisma.registry.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        archivedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, registries: regs });
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

    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        includedActiveRegistries: true,
        stripeSubscriptionStatus: true,
      },
    });
    
    if (!org) {
      return NextResponse.json(
        { ok: false, message: "Org not found." },
        { status: 404 }
      );
    }

    const activeCount = await prisma.registry.count({
      where: { orgId, status: "active" },
    });
    
    const over = activeCount >= org.includedActiveRegistries;
    const isPaid = PAID.has(org.stripeSubscriptionStatus);

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

    const registry = await prisma.registry.create({
      data: { orgId, name, status: "active" },
      select: { id: true },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        registryId: registry.id,
        actorClerkUserId: userId,
        action: "registry_create",
        targetType: "registry",
        targetId: registry.id,
        meta: { name },
      },
    });

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
