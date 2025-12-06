import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function getCurrentUser() {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  // Get or create user in database
  const clerkUser = await currentUser()
  if (!clerkUser) {
    return null
  }

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      orgMemberships: {
        include: {
          organization: true,
        },
      },
    },
  })

  // Create user if doesn't exist
  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        firstName: clerkUser.firstName || null,
        lastName: clerkUser.lastName || null,
        role: 'client', // Default role
      },
      include: {
        orgMemberships: {
          include: {
            organization: true,
          },
        },
      },
    })
  }

  return user
}

export async function requireAuth(requiredRole?: 'attorney' | 'client' | 'admin') {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    throw new Error('Forbidden')
  }

  return user
}

export async function getOrganizationMembership(userId: string) {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    include: {
      organization: true,
    },
  })

  return membership
}

