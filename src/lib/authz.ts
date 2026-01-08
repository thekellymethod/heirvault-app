// src/lib/authz.ts
import { auth } from "@clerk/nextjs/server";
// Prisma removed - database access needs to be implemented

export async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}

export async function requireOrgMember(orgId: string) {
  const userId = await requireUserId();
  const { findUnique } = await import("@/lib/db");
  
  // Get user from database to get their ID
  type UserRecord = { id: string; clerkId: string };
  const user = await findUnique<UserRecord>("users", { clerkId: userId });
  if (!user) throw new Error("UNAUTHENTICATED");
  
  type OrgMemberRecord = { id: string; userId: string; organizationId: string; role: string };
  const member = await findUnique<OrgMemberRecord>("org_members", { 
    organizationId: orgId,
    userId: user.id,
  });
  if (!member) throw new Error("FORBIDDEN");
  return { userId, role: member.role };
}

export async function requireRegistryAccess(registryId: string) {
  const userId = await requireUserId();
  const { findUnique } = await import("@/lib/db");
  
  type RegistryRecord = { id: string; orgId: string };
  const reg = await findUnique<RegistryRecord>("registries", { id: registryId });
  if (!reg) throw new Error("NOT_FOUND");

  // Get user from database to get their ID
  type UserRecord = { id: string; clerkId: string };
  const user = await findUnique<UserRecord>("users", { clerkId: userId });
  if (!user) throw new Error("UNAUTHENTICATED");

  type OrgMemberRecord = { id: string; userId: string; organizationId: string; role: string };
  const member = await findUnique<OrgMemberRecord>("org_members", {
    organizationId: reg.orgId,
    userId: user.id,
  });
  if (!member) throw new Error("FORBIDDEN");

  return { userId, role: member.role, registry: reg };
}

// Get current user with organization context
export async function getCurrentUserWithOrg() {
  const userId = await requireUserId();
  const { findUnique } = await import("@/lib/db");
  
  type UserRecord = { id: string; clerkId: string; email: string };
  const user = await findUnique<UserRecord>("users", { clerkId: userId });
  if (!user) throw new Error("UNAUTHENTICATED");
  
  type OrgMemberRecord = { id: string; userId: string; organizationId: string; role: string };
  const member = await findUnique<OrgMemberRecord>("org_members", { userId: user.id });
  if (!member) {
    return { user, org: null, role: null };
  }
  
  type OrgRecord = { id: string; name: string };
  const org = await findUnique<OrgRecord>("organizations", { id: member.organizationId });
  return { user, org, role: member.role };
}

// Require attorney or owner access
export async function requireAttorneyOrOwner(clientId?: string) {
  const { getCurrentUserWithOrg } = await import("@/lib/authz");
  const { user, org, role } = await getCurrentUserWithOrg();
  
  // Check if user is admin
  const { isAdmin } = await import("@/lib/admin");
  // Get user with roles from database
  const { getOrCreateAppUser } = await import("@/lib/auth/CurrentUser");
  const userWithRoles = await getOrCreateAppUser();
  if (userWithRoles && await isAdmin(userWithRoles)) {
    return { user, org, orgMember: org ? { organizations: org, role } : null };
  }
  
  // If clientId is provided, check access to that specific client
  if (clientId) {
    // Check if user is attorney with access to this client
    const { findUnique } = await import("@/lib/db");
    type ClientRecord = { id: string; orgId: string | null };
    const client = await findUnique<ClientRecord>("clients", { id: clientId });
    
    if (!client) throw new Error("NOT_FOUND");
    
    // Check if client belongs to user's org
    if (org && client.orgId === org.id) {
      return { user, org, orgMember: { organizations: org, role: role || "" } };
    }
    
    throw new Error("FORBIDDEN");
  }
  
  // No clientId provided - just return user and org
  return { user, org, orgMember: org ? { organizations: org, role: role || "" } : null };
}

// Assert attorney can access client
export async function assertAttorneyCanAccessClient(clientId: string) {
  await requireAttorneyOrOwner(clientId);
}