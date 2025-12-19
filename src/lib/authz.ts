import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";
import { OrgRole } from "@prisma/client";
import { getCurrentUser } from "./utils/clerk";

export async function getCurrentUserWithOrg() {
  const { userId } = await auth();
  if (!userId) return { clerkId: null, user: null, orgMember: null };

  // Use getCurrentUser to ensure user exists in database
  const user = await getCurrentUser();
  if (!user) return { clerkId: userId, user: null, orgMember: null };

  // Get user with org memberships - use raw SQL first to avoid Prisma client issues
  let userWithOrg: any = null;
  let orgMember: any = null;

  try {
    // Try raw SQL first
    const rawResult = await prisma.$queryRaw<Array<{
      user_id: string;
      organization_id: string;
      role: string;
      org_name: string;
      user_email: string;
      user_first_name: string | null;
      user_last_name: string | null;
    }>>`
      SELECT 
        om.user_id,
        om.organization_id,
        om.role,
        o.name as org_name,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name
      FROM org_members om
      INNER JOIN organizations o ON o.id = om.organization_id
      INNER JOIN users u ON u.id = om.user_id
      WHERE om.user_id = ${user.id}
      LIMIT 1
    `;

    if (rawResult && rawResult.length > 0) {
      const row = rawResult[0];
      userWithOrg = {
        id: user.id,
        email: row.user_email,
        firstName: row.user_first_name,
        lastName: row.user_last_name,
        orgMemberships: [{
          organizationId: row.organization_id,
          role: row.role,
          organizations: {
            id: row.organization_id,
            name: row.org_name,
          },
        }],
      };
      orgMember = userWithOrg.orgMemberships[0];
    }
  } catch (sqlError: any) {
    console.error("getCurrentUserWithOrg: Raw SQL failed, trying Prisma:", sqlError.message);
    // Fallback to Prisma
    try {
      userWithOrg = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          orgMemberships: {
            include: {
              organizations: true,
            },
          },
          clientRecord: true,
        },
      });
      orgMember = userWithOrg?.orgMemberships[0] || null;
    } catch (prismaError: any) {
      console.error("getCurrentUserWithOrg: Prisma also failed:", prismaError.message);
      // Return user without org if both fail
      userWithOrg = user;
      orgMember = null;
    }
  }

  return { clerkId: userId, user: userWithOrg || user, orgMember };
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
  if (user.role !== 'attorney') {
    throw new Error("Forbidden: Only attorneys can access client data")
  }

  // Verify client exists - use raw SQL first
  try {
    const clientResult = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM clients WHERE id = ${clientId} LIMIT 1
    `;
    
    if (!clientResult || clientResult.length === 0) {
      // Try Prisma fallback
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true },
      });
      
      if (!client) {
        throw new Error("Client not found");
      }
    }
  } catch (error: any) {
    if (error.message === "Client not found") {
      throw error;
    }
    console.error('assertAttorneyCanAccessClient: Error checking client existence:', error.message);
    // Continue - if client doesn't exist, the API will return 404
  }

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

