import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";
import { OrgRole } from "@prisma/client";

export async function getCurrentUserWithOrg() {
  const { userId } = await auth();
  if (!userId) return { clerkId: null, user: null, orgMember: null };

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      orgMemberships: {
        include: {
          organization: true,
        },
      },
      clientRecord: true,
    },
  });

  const orgMember = user?.orgMemberships[0] || null;

  return { clerkId: userId, user, orgMember };
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
    throw new Error("Unauthorized")
  }

  // Check org-level access. Minimal v1: any member of org that holds an AccessGrant
  const grant = await prisma.accessGrant.findFirst({
    where: {
      clientId,
      orgId: orgMember.organizationId,
      status: "ACTIVE",
    },
  })

  if (!grant) {
    throw new Error("Forbidden")
  }

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

