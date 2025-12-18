import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/utils/clerk";

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

    // Check if user has attorney role in Clerk or DB
    const clerkUser = await currentUser();
    const clerkRole = (clerkUser?.publicMetadata as any)?.role;
    const hasAttorneyRole = clerkRole === "attorney" || clerkRole === "admin" || 
                           user.role === "attorney" || user.role === "admin";

    if (!hasAttorneyRole) {
      return NextResponse.json(
        { error: "Attorney role required" },
        { status: 403 }
      );
    }
    
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Check if user already has an organization
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        orgMemberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (existingUser?.orgMemberships && existingUser.orgMemberships.length > 0) {
      // User already has an organization, redirect to dashboard
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
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    let finalSlug = slug;
    if (existingOrg) {
      // Append a random string if slug exists
      finalSlug = `${slug}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // Create organization and add user as owner
    console.log("Creating organization for user:", user.id, "with name:", name.trim());
    const organization = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    console.log("Organization created successfully:", organization.id, "with", organization.members.length, "member(s)");

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

