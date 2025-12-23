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
  const emailRaw =
    cu?.emailAddresses?.find(e => e.id === cu.primaryEmailAddressId)?.emailAddress ??
    cu?.emailAddresses?.[0]?.emailAddress ??
    null;

  if (!emailRaw) throw new Error("No email found for Clerk user.");

  // Normalize email to lowercase for consistent matching across OAuth providers
  // Apple, Google, and Microsoft may provide emails in different cases
  const email = emailRaw.toLowerCase().trim();

  // Check if this is the bootstrap admin email
  const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@heirvault.app";
  const isAdmin = email === bootstrapAdminEmail.toLowerCase();

  // Determine initial roles
  const initialRoles = isAdmin ? ["USER", "ADMIN"] : ["USER"];

  // First, check if user exists by Clerk ID
  let existingUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, roles: true, email: true, clerkId: true },
  });

  // If not found by Clerk ID, check if user exists by email (from pending application)
  // This links accounts when someone applies before signing in
  // Note: Email matching is case-insensitive - we normalize to lowercase
  if (!existingUser) {
    // Use case-insensitive email lookup via raw SQL since Prisma's findUnique is case-sensitive
    // Query by id only, then use Prisma to get full user object with proper types
    const userByEmailResult = await prisma.$queryRawUnsafe<Array<{
      id: string;
    }>>(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      email
    );

    const userByEmail = userByEmailResult.length > 0 
      ? await prisma.user.findUnique({
          where: { id: userByEmailResult[0].id },
          select: { id: true, roles: true, email: true, clerkId: true },
        })
      : null;

    if (userByEmail) {
      // Check if the existing user has a placeholder clerkId (pending_*)
      const hasPlaceholder = userByEmail.clerkId?.startsWith("pending_");
      
      if (hasPlaceholder) {
        // Link the Clerk account to the existing user account
        // Update clerkId from placeholder (pending_*) to actual Clerk ID
        // Also normalize email to lowercase for consistency
        existingUser = await prisma.user.update({
          where: { id: userByEmail.id },
          data: {
            clerkId: userId, // Link Clerk account
            email: email, // Normalize email to lowercase
          },
          select: { id: true, roles: true, email: true, clerkId: true },
        });
        console.log(`[AUDIT] Linked Clerk account (${userId}) to existing user by email: ${email} (OAuth provider: ${cu?.externalAccounts?.[0]?.provider || 'unknown'})`);
      } else {
        // User exists with a different clerkId - this shouldn't happen normally
        // But if it does, we'll use the existing user and update the clerkId
        existingUser = await prisma.user.update({
          where: { id: userByEmail.id },
          data: {
            clerkId: userId, // Update to new Clerk ID
            email: email, // Normalize email to lowercase
          },
          select: { id: true, roles: true, email: true, clerkId: true },
        });
        console.warn(`[AUDIT] User with email ${email} exists but had different clerkId: ${userByEmail.clerkId} -> ${userId} (OAuth provider: ${cu?.externalAccounts?.[0]?.provider || 'unknown'})`);
      }
    }
  }

  let dbUser: AppUser;

  if (existingUser) {
    // Update existing user - ensure ADMIN role is added if email matches
    let updatedRoles = existingUser.roles;
    if (isAdmin && !existingUser.roles.includes("ADMIN")) {
      updatedRoles = [...new Set([...existingUser.roles, "ADMIN"])];
      console.log(`[AUDIT] Adding ADMIN role to existing user: ${email} (was: ${existingUser.roles.join(", ")})`);
    }

    dbUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        email,
        roles: updatedRoles,
        clerkId: userId, // Ensure clerkId is updated (in case it was a placeholder)
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
