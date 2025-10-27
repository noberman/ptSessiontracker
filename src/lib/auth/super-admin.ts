/**
 * Super Admin Helper Functions
 * For beta management and debugging
 */

import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

/**
 * Check if a user is a super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    return user?.role === 'SUPER_ADMIN'
  } catch (error) {
    console.error('Error checking super admin status:', error)
    return false
  }
}

/**
 * Create a temporary authentication token for Login As feature
 */
export async function createTempToken(
  adminId: string,
  targetUserId: string,
  organizationId: string,
  reason?: string
): Promise<{ token: string; expiresAt: Date; url: string }> {
  // Verify admin is super admin
  const isAdmin = await isSuperAdmin(adminId)
  if (!isAdmin) {
    throw new Error('Unauthorized: Not a super admin')
  }

  // Generate secure token
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

  // Get target user info
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { name: true, email: true }
  })

  if (!targetUser) {
    throw new Error('Target user not found')
  }

  // Create token in database
  const tempToken = await prisma.tempAuthToken.create({
    data: {
      token,
      userId: targetUserId,
      adminId,
      expiresAt,
      metadata: {
        organizationId,
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        reason: reason || 'Beta support'
      }
    }
  })

  // Log the action
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'LOGIN_AS_START',
      targetUserId,
      targetOrgId: organizationId,
      metadata: {
        reason: reason || 'Beta support',
        tokenId: tempToken.id,
        expiresAt
      }
    }
  })

  // Return token info with URL
  return {
    token,
    expiresAt,
    url: `/auth/temp-login?token=${token}`
  }
}

/**
 * Validate a temporary authentication token
 */
export async function validateTempToken(token: string) {
  const tempToken = await prisma.tempAuthToken.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          organization: true,
          locations: {
            include: {
              location: true
            }
          }
        }
      },
      admin: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  if (!tempToken) {
    throw new Error('Invalid token')
  }

  if (tempToken.revokedAt) {
    throw new Error('Token has been revoked')
  }

  if (new Date() > tempToken.expiresAt) {
    throw new Error('Token has expired')
  }

  // Mark token as used if first time
  if (!tempToken.usedAt) {
    await prisma.tempAuthToken.update({
      where: { id: tempToken.id },
      data: { usedAt: new Date() }
    })
  }

  return {
    user: tempToken.user,
    admin: tempToken.admin,
    metadata: tempToken.metadata
  }
}

/**
 * Revoke a temporary authentication token
 */
export async function revokeTempToken(token: string, adminId?: string) {
  const tempToken = await prisma.tempAuthToken.findUnique({
    where: { token }
  })

  if (!tempToken) {
    return // Token doesn't exist, consider it revoked
  }

  if (tempToken.revokedAt) {
    return // Already revoked
  }

  // Revoke the token
  await prisma.tempAuthToken.update({
    where: { token },
    data: { revokedAt: new Date() }
  })

  // Log the action
  await prisma.adminAuditLog.create({
    data: {
      adminId: adminId || tempToken.adminId,
      action: 'LOGIN_AS_END',
      targetUserId: tempToken.userId,
      metadata: {
        tokenId: tempToken.id,
        duration: tempToken.usedAt 
          ? new Date().getTime() - tempToken.usedAt.getTime()
          : 0
      }
    }
  })
}

/**
 * Get all organizations with summary data
 */
export async function getOrganizationsForSuperAdmin(includeClones = false) {
  const orgs = await prisma.organization.findMany({
    where: includeClones ? {} : {
      isClone: false // Don't show clones in main list by default
    },
    include: {
      _count: {
        select: {
          users: true,
          sessions: true,
          clients: true
        }
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1 // Get most recent user for last activity
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return orgs.map(org => ({
    id: org.id,
    name: org.name,
    email: org.email,
    subscriptionTier: org.subscriptionTier,
    createdAt: org.createdAt,
    userCount: org._count.users,
    sessionCount: org._count.sessions,
    clientCount: org._count.clients,
    lastActivity: org.users[0]?.createdAt || org.createdAt,
    isClone: org.isClone,
    clonedFrom: org.clonedFrom,
    betaAccess: org.betaAccess,
    betaExpiresAt: org.betaExpiresAt
  }))
}

/**
 * Export organization data for debugging
 */
export async function exportOrganizationData(organizationId: string, adminId: string) {
  // Verify admin
  const isAdmin = await isSuperAdmin(adminId)
  if (!isAdmin) {
    throw new Error('Unauthorized: Not a super admin')
  }

  // Get all data
  const [
    organization,
    users,
    clients,
    packages,
    sessions,
    commissionTiers,
    locations,
    packageTypes
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.user.findMany({ where: { organizationId } }),
    prisma.client.findMany({ where: { organizationId } }),
    prisma.package.findMany({ where: { organizationId } }),
    prisma.session.findMany({ where: { organizationId } }),
    prisma.commissionTier.findMany({ where: { organizationId } }),
    prisma.location.findMany({ where: { organizationId } }),
    prisma.packageType.findMany({ where: { organizationId } })
  ])

  // Log the export
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'EXPORT_DATA',
      targetOrgId: organizationId,
      metadata: {
        recordCounts: {
          users: users.length,
          clients: clients.length,
          packages: packages.length,
          sessions: sessions.length,
          locations: locations.length
        }
      }
    }
  })

  return {
    metadata: {
      exportedAt: new Date(),
      exportedBy: adminId,
      organizationId,
      version: '1.0',
      recordCounts: {
        users: users.length,
        clients: clients.length,
        packages: packages.length,
        sessions: sessions.length,
        commissionTiers: commissionTiers.length,
        locations: locations.length,
        packageTypes: packageTypes.length
      }
    },
    organization,
    users: users.map(u => ({ ...u, password: '[REDACTED]' })), // Don't export passwords
    clients,
    packages,
    sessions,
    commissionTiers,
    locations,
    packageTypes
  }
}

