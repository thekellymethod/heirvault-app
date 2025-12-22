import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export type AppUser = {
  id: string;
  clerkId: string;
  email: string;
  roles: string[];
};

export async function getOrCreateAppUser(): Promise<AppUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const cu = await currentUser();
  const email =
    cu?.emailAddresses?.find(e => e.id === cu.primaryEmailAddressId)?.emailAddress ??
    cu?.emailAddresses?.[0]?.emailAddress ??
    null;

  if (!email) throw new Error("No email found for Clerk user.");

  // Check if this is the bootstrap admin email
  const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@heirvault.app";
  const isAdmin = email.toLowerCase() === bootstrapAdminEmail.toLowerCase();

  // Determine initial roles
  const initialRoles = isAdmin ? ["USER", "ADMIN"] : ["USER"];

  // Check if user exists first
  const existingUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, roles: true, email: true },
  });

  let dbUser: AppUser;

  if (existingUser) {
    // Update existing user - ensure ADMIN role is added if email matches
    let updatedRoles = existingUser.roles;
    if (isAdmin && !existingUser.roles.includes("ADMIN")) {
      updatedRoles = [...new Set([...existingUser.roles, "ADMIN"])];
      console.log(`[AUDIT] Adding ADMIN role to existing user: ${email} (was: ${existingUser.roles.join(", ")})`);
    }

    dbUser = await prisma.user.update({
      where: { clerkId: userId },
      data: {
        email,
        roles: updatedRoles,
      },
      select: { id: true, clerkId: true, email: true, roles: true },
    });

    // Log admin bootstrap if admin was just added
    if (isAdmin && !existingUser.roles.includes("ADMIN") && dbUser.roles.includes("ADMIN")) {
      console.log(`[AUDIT] Admin user bootstrapped: ${email}`);
    }
  } else {
    // Create new user
    dbUser = await prisma.user.create({
      data: { clerkId: userId, email, roles: initialRoles },
      select: { id: true, clerkId: true, email: true, roles: true },
    });

    // Log admin bootstrap if this is a new admin user
    if (isAdmin) {
      console.log(`[AUDIT] Admin user bootstrapped: ${email}`);
    }
  }

  return dbUser;
}
