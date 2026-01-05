// src/lib/authz.ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHENTICATED");
  return userId;
}

export async function requireOrgMember(orgId: string) {
  const userId = await requireUserId();
  const member = await prisma.orgMember.findUnique({
    where: { orgId_clerkUserId: { orgId, clerkUserId: userId } },
    select: { role: true },
  });
  if (!member) throw new Error("FORBIDDEN");
  return { userId, role: member.role };
}

export async function requireRegistryAccess(registryId: string) {
  const userId = await requireUserId();
  const reg = await prisma.registry.findUnique({
    where: { id: registryId },
    select: { id: true, orgId: true, status: true, name: true },
  });
  if (!reg) throw new Error("NOT_FOUND");

  const member = await prisma.orgMember.findUnique({
    where: { orgId_clerkUserId: { orgId: reg.orgId, clerkUserId: userId } },
    select: { role: true },
  });
  if (!member) throw new Error("FORBIDDEN");

  return { userId, role: member.role, registry: reg };
}
