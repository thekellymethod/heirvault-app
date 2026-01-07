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
  const user = await findUnique("users", { clerkId: userId });
  if (!user) throw new Error("UNAUTHENTICATED");
  
  const member = await findUnique("org_members", { 
    organizationId: orgId,
    userId: user.id,
  });
  if (!member) throw new Error("FORBIDDEN");
  return { userId, role: member.role };
}

export async function requireRegistryAccess(registryId: string) {
  const userId = await requireUserId();
  const { findUnique } = await import("@/lib/db");
  
  const reg = await findUnique("registries", { id: registryId });
  if (!reg) throw new Error("NOT_FOUND");

  // Get user from database to get their ID
  const user = await findUnique("users", { clerkId: userId });
  if (!user) throw new Error("UNAUTHENTICATED");

  const member = await findUnique("org_members", {
    organizationId: reg.orgId,
    userId: user.id,
  });
  if (!member) throw new Error("FORBIDDEN");

  return { userId, role: member.role, registry: reg };
}
