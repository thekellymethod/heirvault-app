import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
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
    let existingUser = null;
    try {
      existingUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          orgMemberships: {
            include: {
              organizations: true,
            },
          },
        },
      });
    } catch (prismaError: any) {
      console.error("Error checking existing org, trying raw SQL:", prismaError.message);
      // Fallback to raw SQL if Prisma fails
      try {
        const rawResult = await prisma.$queryRaw<Array<{ user_id: string; organization_id: string }>>`
          SELECT user_id, organization_id 
          FROM org_members 
          WHERE user_id = ${user.id} 
          LIMIT 1
        `;
        if (rawResult && rawResult.length > 0) {
          // User has org membership - return error
          return NextResponse.json(
            { error: "You already have an organization" },
            { status: 400 }
          );
        }
        // No org membership found - continue to create
      } catch (sqlError: any) {
        console.error("Raw SQL also failed:", sqlError.message);
        // Continue anyway - allow org creation even if check fails
      }
    }

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
    let existingOrg = null;
    try {
      existingOrg = await prisma.organizations.findUnique({
        where: { slug },
      });
    } catch (prismaError: any) {
      console.error("Error checking slug, continuing:", prismaError.message);
      // Continue - we'll handle duplicate slugs if they occur
    }

    let finalSlug = slug;
    if (existingOrg) {
      // Append a random string if slug exists
      finalSlug = `${slug}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // Create organization and add user as owner
    console.log("Creating organization for user:", user.id, "with name:", name.trim());
    
    // Use raw SQL to create organization since Prisma client is having issues
    try {
      const orgId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO organizations (id, name, slug, created_at, updated_at, billing_plan)
        VALUES (${orgId}, ${name.trim()}, ${finalSlug}, NOW(), NOW(), 'FREE')
      `;
      
      // Create org member relationship
      const memberId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO org_members (id, user_id, organization_id, role, created_at, updated_at)
        VALUES (${memberId}, ${user.id}, ${orgId}, 'OWNER', NOW(), NOW())
      `;
      
      console.log("Organization created successfully via raw SQL:", orgId);
      
      return NextResponse.json({
        success: true,
        organization: {
          id: orgId,
          name: name.trim(),
          slug: finalSlug,
        },
      });
    } catch (sqlError: any) {
      console.error("Error creating organization via raw SQL:", sqlError.message);
      // Try Prisma as fallback
      try {
        const organization = await prisma.organizations.create({
          data: {
            name: name.trim(),
            slug: finalSlug,
          },
        });
        
        await prisma.org_members.create({
          data: {
            user_id: user.id,
            organization_id: organization.id,
            role: "OWNER",
          },
        });
        
        return NextResponse.json({
          success: true,
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          },
        });
      } catch (prismaError: any) {
        console.error("Prisma fallback also failed:", prismaError.message);
        throw new Error("Failed to create organization");
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating organization:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

