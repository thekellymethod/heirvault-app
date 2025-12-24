import { auth } from "@clerk/nextjs/server";
import { db, users, orgMembers, organizations, eq, sql, prisma } from "./db";
import { getCurrentUser } from "./utils/clerk";
import { randomUUID } from "crypto";

type OrgRole = "OWNER" | "ATTORNEY" | "STAFF";

export async function getCurrentUserWithOrg() {
  const { userId } = await auth();
  if (!userId) return { clerkId: null, user: null, orgMember: null };

  // Use getCurrentUser to ensure user exists in database
  const user = await getCurrentUser();
  if (!user) return { clerkId: userId, user: null, orgMember: null };

  // Get user with org memberships
  let userWithOrg: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    orgMemberships: Array<{
      organizationId: string;
      role: string;
      organizations: {
        id: string;
        name: string;
      };
    }>;
  } | null = null;
  let orgMember: {
    organizationId: string;
    role: string;
    organizations: {
      id: string;
      name: string;
    };
  } | null = null;

  try {
    const result = await db
      .select({
        userId: users.id,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userRole: users.role,
        orgId: orgMembers.organizationId,
        orgRole: orgMembers.role,
        orgName: organizations.name,
      })
      .from(orgMembers)
      .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(eq(orgMembers.userId, user.id))
      .limit(1);

    if (result && result.length > 0) {
      const row = result[0];
      userWithOrg = {
        id: row.userId,
        email: row.userEmail,
        firstName: row.userFirstName,
        lastName: row.userLastName,
        role: row.userRole || 'attorney',
        orgMemberships: [{
          organizationId: row.orgId,
          role: row.orgRole,
          organizations: {
            id: row.orgId,
            name: row.orgName,
          },
        }],
      };
      orgMember = userWithOrg.orgMemberships[0];
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("getCurrentUserWithOrg: Error fetching org membership:", message);
    // Return user without org if query fails
    userWithOrg = user;
    orgMember = null;
  }

  // Admin bypass - admins don't need organizations
  try {
    const { getOrCreateAppUser } = await import("@/lib/auth/CurrentUser");
    const appUser = await getOrCreateAppUser();
    const { hasAdminRole } = await import("@/lib/auth/admin-bypass");
    if (appUser && hasAdminRole(appUser)) {
      // Admin bypass - return user without org requirement
      return {
        clerkId: userId,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role || 'attorney',
          orgMemberships: [],
        },
        orgMember: null,
      };
    }
  } catch (error) {
    // If admin check fails, continue with normal flow
    console.warn("getCurrentUserWithOrg: Admin check failed, continuing with normal flow", error);
  }

  // If user doesn't have an organization, automatically create a personal one
  if (!orgMember && user) {
    try {
      // Generate organization name from user's name or email
      const orgName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.email.split('@')[0];

      // Generate slug from organization name
      const slug = orgName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Check if slug already exists, append random suffix if needed
      const existingOrg = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM organizations WHERE slug = $1 LIMIT 1`,
        slug
      );

      let finalSlug = slug;
      if (existingOrg && existingOrg.length > 0) {
        finalSlug = `${slug}-${randomUUID().slice(0, 8)}`;
      }

      // Create organization and add user as OWNER in a transaction
      const orgId = randomUUID();
      const memberId = randomUUID();

      await db.transaction(async (tx) => {
        // Create organization using raw SQL
        await tx.execute(
          sql`INSERT INTO organizations (id, name, slug, created_at, updated_at)
              VALUES (${orgId}, ${orgName}, ${finalSlug}, NOW(), NOW())`
        );

        // Add user as OWNER of the organization
        await tx.execute(
          sql`INSERT INTO org_members (id, user_id, organization_id, role, created_at, updated_at)
              VALUES (${memberId}, ${user.id}, ${orgId}, 'OWNER', NOW(), NOW())`
        );
      });

      // Fetch the newly created organization and membership
      const newResult = await db
        .select({
          userId: users.id,
          userEmail: users.email,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userRole: users.role,
          orgId: orgMembers.organizationId,
          orgRole: orgMembers.role,
          orgName: organizations.name,
        })
        .from(orgMembers)
        .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
        .innerJoin(users, eq(orgMembers.userId, users.id))
        .where(eq(orgMembers.userId, user.id))
        .limit(1);

      if (newResult && newResult.length > 0) {
        const row = newResult[0];
        userWithOrg = {
          id: row.userId,
          email: row.userEmail,
          firstName: row.userFirstName,
          lastName: row.userLastName,
          role: row.userRole || 'attorney',
          orgMemberships: [{
            organizationId: row.orgId,
            role: row.orgRole,
            organizations: {
              id: row.orgId,
              name: row.orgName,
            },
          }],
        };
        orgMember = userWithOrg.orgMemberships[0];
      }
    } catch (error: unknown) {
      console.error("getCurrentUserWithOrg: Error creating personal organization:", error.message);
      // Continue without org if creation fails
    }
  }

  // Ensure the returned user has a role set (default to attorney)
  const finalUser = userWithOrg || user;
  if (finalUser && !finalUser.role) {
    finalUser.role = 'attorney';
  }
  
  return { clerkId: userId, user: finalUser, orgMember };
}

export function hasOrgRole(orgMember: { role: OrgRole }, role: OrgRole | OrgRole[]) {
  if (Array.isArray(role)) {
    return role.includes(orgMember.role);
  }
  return orgMember.role === role;
}

// Require at least a given role – e.g. OWNER or ATTORNEY
export function hasAtLeastAttorney(orgMember: { role: OrgRole }) {
  return orgMember.role === "OWNER" || orgMember.role === "ATTORNEY";
}

// Throws if unauthorized
export async function requireOrgRole(required: OrgRole | OrgRole[]) {
  const { user, orgMember } = await getCurrentUserWithOrg();

  if (!user || !orgMember) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }

  const ok = hasOrgRole(orgMember, required);
  if (!ok) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  return { user, orgMember };
}

// Require at least attorney-level for client work
export async function requireAttorneyOrOwner() {
  const { user, orgMember } = await getCurrentUserWithOrg();

  if (!user || !orgMember) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }

  if (!hasAtLeastAttorney(orgMember)) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  return { user, orgMember };
}

// For attorney-side client access
// All attorneys can access all clients globally
// Admins have full bypass
export async function assertAttorneyCanAccessClient(clientId: string) {
  const { user, orgMember } = await getCurrentUserWithOrg()

  if (!user) {
    console.error('assertAttorneyCanAccessClient: No user', { user: !!user })
    throw new Error("Unauthorized")
  }

  // Admin bypass - admins can access all clients (check FIRST, before orgMember requirement)
  // Check admin status using the new Prisma user system
  try {
    const { getOrCreateAppUser } = await import("@/lib/auth/CurrentUser");
    const appUser = await getOrCreateAppUser();
    const { hasAdminRole } = await import("@/lib/auth/admin-bypass");
    if (appUser && hasAdminRole(appUser)) {
      console.log('assertAttorneyCanAccessClient: Admin bypass granted', {
        clientId,
        userId: user.id,
      });
      return { user, orgMember: orgMember || null };
    }
  } catch (error) {
    // If admin check fails, continue with normal attorney check
    console.warn('assertAttorneyCanAccessClient: Admin check failed, using normal flow', error);
  }

  // Verify user is an attorney
  // All authenticated users are attorneys by default
  // If role is not set, default to attorney
  const userRole = user.role || 'attorney';
  if (userRole !== 'attorney') {
    throw new Error("Forbidden: Only attorneys can access client data")
  }

  // Note: We don't verify client existence here - the API route will handle that
  // This function only verifies that the user has permission to access clients
  // All attorneys have global access to all clients, even without orgMember

  console.log('assertAttorneyCanAccessClient: Global access granted for attorney', {
    clientId,
    userId: user.id,
    orgId: orgMember?.organizationId || null,
    hasOrgMember: !!orgMember,
  })

  // All attorneys have global access to all clients
  return { user, orgMember: orgMember || null }
}

// For client self-access via invitation token
// Note: Clients don't have accounts - they access via invitation links
// This function is kept for backwards compatibility but should not be used
// Client access should be verified via invitation token instead
export async function assertClientSelfAccess(clientId: string) {
  // Clients don't have accounts - this should not be called
  // Client access is handled via invitation tokens in /invite/[token] routes
  throw new Error("Client self-access requires invitation token, not user account")
}

// Require org scope - returns the org ID for the current user
export async function requireOrgScope() {
  const { user, orgMember } = await getCurrentUserWithOrg();

  if (!user || !orgMember) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }

  return { scopeOrgId: orgMember.organizationId, user, orgMember };
}

