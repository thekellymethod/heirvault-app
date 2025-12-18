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

  // Get user with org memberships
  const userWithOrg = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      orgMemberships: {
        include: {
          organization: true,
        },
      },
      clientRecord: true,
    },
  });

  const orgMember = userWithOrg?.orgMemberships[0] || null;

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
export async function assertAttorneyCanAccessClient(clientId: string) {
  const { user, orgMember } = await getCurrentUserWithOrg()

  if (!user || !orgMember) {
    console.error('assertAttorneyCanAccessClient: No user or orgMember', { user: !!user, orgMember: !!orgMember })
    throw new Error("Unauthorized")
  }

  console.log('assertAttorneyCanAccessClient: Checking access', {
    clientId,
    userId: user.id,
    orgId: orgMember.organizationId,
  })

  // Check org-level access via AccessGrant
  const grant = await prisma.accessGrant.findFirst({
    where: {
      clientId,
      orgId: orgMember.organizationId,
      status: "ACTIVE",
    },
  })

  if (grant) {
    console.log('assertAttorneyCanAccessClient: Access granted via AccessGrant')
    return { user, orgMember }
  }

  console.log('assertAttorneyCanAccessClient: No AccessGrant found, checking AttorneyClientAccess')

  // Also check individual attorney access via AttorneyClientAccess
  const attorneyAccess = await prisma.attorneyClientAccess.findFirst({
    where: {
      clientId,
      attorneyId: user.id,
      organizationId: orgMember.organizationId,
      isActive: true,
    },
  })

  if (!attorneyAccess) {
    console.error('assertAttorneyCanAccessClient: No access found', {
      clientId,
      attorneyId: user.id,
      organizationId: orgMember.organizationId,
    })
    throw new Error("Forbidden")
  }

  console.log('assertAttorneyCanAccessClient: Access granted via AttorneyClientAccess')
  return { user, orgMember }
}

// For client self-access
export async function assertClientSelfAccess(clientId: string) {
  const { user } = await getCurrentUserWithOrg()
  if (!user) throw new Error("Unauthorized")
  if (user.role !== "client") throw new Error("Forbidden")

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { userId: true },
  })

  if (!client || client.userId !== user.id) {
    throw new Error("Forbidden")
  }

  return { user }
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

