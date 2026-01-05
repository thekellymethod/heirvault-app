import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.org.create({
        data: {
          name: firmName,
          createdByClerkUserId: userId,
          // includedActiveRegistries defaults to 5
        },
      });

      await tx.orgMember.create({
        data: {
          orgId: org.id,
          clerkUserId: userId,
          role: "admin",
        },
      });

      const registry = await tx.registry.create({
        data: {
          orgId: org.id,
          name: estateName,
          status: "active",
        },
      });

      await tx.auditLog.create({
        data: {
          orgId: org.id,
          registryId: registry.id,
          actorClerkUserId: userId,
          action: "signup_create_org_registry",
          targetType: "registry",
          targetId: registry.id,
        },
      });

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
