import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type Role = "attorney" | "client" | "admin";

function normalizeRole(r?: string | null): Role | null {
  if (!r) return null;
  const v = r.toLowerCase();
  if (v === "attorney" || v === "client" || v === "admin") return v;
  return null;
}

export async function getCurrentUser() {
  const { userId } = auth();
  if (!userId) return null;

  const cu = await currentUser();
  if (!cu) return null;

  const email = cu.emailAddresses?.[0]?.emailAddress ?? null;
  const firstName = cu.firstName ?? null;
  const lastName = cu.lastName ?? null;

  if (!email) return null;

  // If you store role in Clerk public metadata: cu.publicMetadata.role
  // Otherwise this will keep DB role as source of truth.
  const clerkRole = normalizeRole((cu.publicMetadata as any)?.role ?? null);

  const dbUser = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {
      email,
      firstName,
      lastName,
      ...(clerkRole ? { role: clerkRole } : {}),
    },
    create: {
      clerkId: userId,
      email,
      firstName,
      lastName,
      role: clerkRole ?? "client",
    },
    select: {
      id: true,
      clerkId: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  return dbUser;
}

export async function requireAuth(requiredRole?: Role) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  if (requiredRole && user.role !== requiredRole) {
    throw new Error("Forbidden");
  }

  return user;
}
