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
  // Database has clerkId (camelCase) - it's in the known camelCase list, so it won't be converted
  type UserRecord = { id: string; clerkId: string };
  const user = await findUnique<UserRecord>("users", { clerkId: userId });
  if (!user) throw new Error("UNAUTHENTICATED");
  
  // Database uses snake_case: user_id, organization_id
  type OrgMemberRecord = { id: string; user_id: string; organization_id: string; role: string };
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
  
  // Database uses snake_case: org_id
  type RegistryRecord = { id: string; org_id: string };
  const reg = await findUnique<RegistryRecord>("registries", { id: registryId });
  if (!reg) throw new Error("NOT_FOUND");

  // Get user from database to get their ID
  // Database has clerkId (camelCase) - it's in the known camelCase list, so it won't be converted
  type UserRecord = { id: string; clerkId: string };
  const user = await findUnique<UserRecord>("users", { clerkId: userId });
  if (!user) throw new Error("UNAUTHENTICATED");

  // Database uses snake_case: user_id, organization_id
  type OrgMemberRecord = { id: string; user_id: string; organization_id: string; role: string };
  const member = await findUnique<OrgMemberRecord>("org_members", {
    organizationId: reg.org_id,
    userId: user.id,
  });
  if (!member) throw new Error("FORBIDDEN");

  return { userId, role: member.role, registry: reg };
}

// Get current user with organization context
export async function getCurrentUserWithOrg() {
  const userId = await requireUserId();
  const { findUnique, findMany } = await import("@/lib/db");
  
  // Database has clerkId (camelCase) - it's in the known camelCase list, so it won't be converted
  type UserRecord = { id: string; clerkId: string; email: string };
  const user = await findUnique<UserRecord>("users", { clerkId: userId });
  if (!user) throw new Error("UNAUTHENTICATED");
  
  // Database uses snake_case: user_id, organization_id.
  // Users may have multiple memberships; findUnique uses .single() and throws if >1 row.
  type OrgMemberRecord = { id: string; user_id: string; organization_id: string; role: string };
  const members = await findMany<OrgMemberRecord>("org_members", {
    where: { userId: user.id },
    limit: 1,
  });
  const member = members[0] ?? null;
  if (!member) {
    return { user, org: null, role: null, orgMember: null };
  }
  
  type OrgRecord = { id: string; name: string };
  const org = await findUnique<OrgRecord>("organizations", { id: member.organization_id });
  return { user, org, role: member.role, orgMember: member };
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
    // Database uses snake_case: org_id
    type ClientRecord = { id: string; org_id: string | null };
    const client = await findUnique<ClientRecord>("clients", { id: clientId });
    
    if (!client) throw new Error("NOT_FOUND");
    
    // Check if client belongs to user's org
    if (org && client.org_id === org.id) {
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