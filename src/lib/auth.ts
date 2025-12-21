import { currentUser } from "@clerk/nextjs/server";
import { HttpError } from "@/lib/errors";
import { isRole, Role } from "@/lib/roles";

export type AppUser = {
  id: string;
  email: string | null;
  role: Role;
};

export async function getUser(): Promise<AppUser | null> {
  const u = await currentUser();
  if (!u) return null;

  const email = u.emailAddresses?.[0]?.emailAddress ?? null;
  const metaRole = (u.publicMetadata?.role ?? u.privateMetadata?.role) as unknown;

  // Default is DENY (no silent elevation)
  if (!isRole(metaRole)) return { id: u.id, email, role: "SYSTEM" }; // treat unknown as SYSTEM (locked-down)

  return { id: u.id, email, role: metaRole };
}

export async function requireAttorney(): Promise<AppUser> {
  const user = await getUser();
  if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Authentication required.");
  if (user.role !== "ATTORNEY" && user.role !== "ADMIN") {
    throw new HttpError(403, "FORBIDDEN", "Attorney access required.");
  }
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await getUser();
  if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Authentication required.");
  if (user.role !== "ADMIN") throw new HttpError(403, "FORBIDDEN", "Admin access required.");
  return user;
}
