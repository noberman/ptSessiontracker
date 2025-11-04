import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

/**
 * Get the current user's organization ID from the session
 * Throws an error if no organization context is found
 */
export async function getOrganizationId(): Promise<string> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.organizationId) {
    throw new Error('No organization context found in session')
  }
  
  return session.user.organizationId
}

/**
 * Create a Prisma filter object for the given organization
 */
export function createOrgFilter(organizationId: string) {
  return { organizationId }
}

/**
 * Validate that a user has access to a specific organization
 */
export async function validateOrgAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true }
  })
  
  return user?.organizationId === organizationId
}

/**
 * Get organization details from session
 */
export async function getCurrentOrganization() {
  const orgId = await getOrganizationId()
  
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      email: true,
      subscriptionTier: true,
      subscriptionStatus: true,
    }
  })
  
  if (!organization) {
    throw new Error('Organization not found')
  }
  
  return organization
}

/**
 * Check if the current user's organization has a specific subscription tier
 */
export async function hasSubscriptionTier(
  requiredTiers: string[]
): Promise<boolean> {
  try {
    const org = await getCurrentOrganization()
    return requiredTiers.includes(org.subscriptionTier || 'FREE')
  } catch {
    return false
  }
}