import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
;
import { getCurrentUser } from "@/lib/utils/clerk";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    // Get user - don't require attorney role yet since they might be setting it up
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    // All accounts are attorney accounts - no need to check role
    
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Check if user already has an organization
    const { findMany: findManyMembers, findMany: findManyOrgs, create: createDb } = await import("@/lib/db");
    
    type OrgMemberRecord = {
      id: string;
      userId: string;
      organizationId: string;
    };
    
    const existingMemberships = await findManyMembers<OrgMemberRecord>("org_members", {
      where: { userId: user.id },
      limit: 1,
    });

    if (existingMemberships && existingMemberships.length > 0) {
      return NextResponse.json(
        { error: "You already have an organization" },
        { status: 400 }
      );
    }

    // Generate a slug from the organization name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check if slug already exists
    type OrgRecord = {
      id: string;
      slug: string;
    };
    
    const existingOrgs = await findManyOrgs<OrgRecord>("organizations", {
      where: { slug },
      limit: 1,
    });

    let finalSlug = slug;
    if (existingOrgs && existingOrgs.length > 0) {
      // Append a random string if slug exists
      finalSlug = `${slug}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // Create organization and add user as owner
    console.log("Creating organization for user:", user.id, "with name:", name.trim());
    
    const orgId = randomUUID();
    const now = new Date().toISOString();
    const organization = await createDb("organizations", {
      id: orgId,
      name: name.trim(),
      slug: finalSlug,
      billingPlan: "FREE",
      createdAt: now,
      updatedAt: now,
    } as any) as any;
    
    await createDb("org_members", {
      id: randomUUID(),
      userId: user.id,
      organizationId: organization.id,
      role: "OWNER",
      createdAt: now,
      updatedAt: now,
    } as any);
    
    console.log("Organization created successfully:", organization.id);
    
    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating organization:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

