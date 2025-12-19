import { auth } from "@clerk/nextjs/server";
import { db, users, orgMembers, organizations, eq } from "./db";
import { getCurrentUser } from "./utils/clerk";

type OrgRole = "OWNER" | "ATTORNEY" | "STAFF";

export async function getCurrentUserWithOrg() {
  const { userId } = await auth();
  if (!userId) return { clerkId: null, user: null, orgMember: null };

  // Use getCurrentUser to ensure user exists in database
  const user = await getCurrentUser();
  if (!user) return { clerkId: userId, user: null, orgMember: null };

  // Get user with org memberships
  let userWithOrg: any = null;
  let orgMember: any = null;

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
  } catch (error: any) {
    console.error("getCurrentUserWithOrg: Error fetching org membership:", error.message);
    // Return user without org if query fails
    userWithOrg = user;
    orgMember = null;
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
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }

  const ok = hasOrgRole(orgMember, required);
  if (!ok) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  return { user, orgMember };
}

// Require at least attorney-level for client work
export async function requireAttorneyOrOwner() {
  const { user, orgMember } = await getCurrentUserWithOrg();

  if (!user || !orgMember) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }

  if (!hasAtLeastAttorney(orgMember)) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  return { user, orgMember };
}

// For attorney-side client access
// All attorneys can access all clients globally
export async function assertAttorneyCanAccessClient(clientId: string) {
  const { user, orgMember } = await getCurrentUserWithOrg()

  if (!user || !orgMember) {
    console.error('assertAttorneyCanAccessClient: No user or orgMember', { user: !!user, orgMember: !!orgMember })
    throw new Error("Unauthorized")
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

  console.log('assertAttorneyCanAccessClient: Global access granted for attorney', {
    clientId,
    userId: user.id,
    orgId: orgMember.organizationId,
  })

  // All attorneys have global access to all clients
  return { user, orgMember }
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
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }

  return { scopeOrgId: orgMember.organizationId, user, orgMember };
}

