import { prisma } from '@/lib/prisma'
import { Role, InvitationStatus } from '@prisma/client'
import { randomBytes } from 'crypto'
import { getOrganizationUsage } from '@/lib/usage-limits'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'

interface CreateInvitationParams {
  email: string
  role: Role
  organizationId: string
  invitedById: string
}

interface InvitationWithRelations {
  id: string
  email: string
  role: Role
  status: InvitationStatus
  token: string
  expiresAt: Date
  createdAt: Date
  invitedBy: {
    name: string
    email: string
  }
  organization: {
    name: string
  }
}

/**
 * Create a new invitation
 */
export async function createInvitation({
  email,
  role,
  organizationId,
  invitedById,
}: CreateInvitationParams) {
  // Check if user already exists in organization
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { organization: true },
  })

  if (existingUser?.organizationId === organizationId) {
    throw new Error('User is already a member of this organization')
  }

  // Check if there's already a pending invitation
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      email,
      organizationId,
      status: 'PENDING',
    },
  })

  if (existingInvitation) {
    throw new Error('An invitation has already been sent to this email')
  }

  // Check usage limits based on subscription tier
  const canInvite = await checkInvitationLimit(organizationId)
  if (!canInvite.allowed) {
    throw new Error(canInvite.reason)
  }

  // Generate secure token
  const token = generateSecureToken()

  // Set expiration to 7 days from now
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // Create invitation
  const invitation = await prisma.invitation.create({
    data: {
      email,
      role,
      organizationId,
      invitedById,
      token,
      expiresAt,
      status: 'PENDING',
    },
    include: {
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
      organization: {
        select: {
          name: true,
        },
      },
    },
  })

  // Log the invitation
  await prisma.auditLog.create({
    data: {
      userId: invitedById,
      action: 'INVITATION_SENT',
      entityType: 'Invitation',
      entityId: invitation.id,
      newValue: {
        email,
        role,
        organizationId,
      },
    },
  })

  return invitation
}

/**
 * Check if organization can send more invitations based on subscription limits
 */
export async function checkInvitationLimit(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })

  if (!org) {
    return { allowed: false, reason: 'Organization not found' }
  }

  const tier = SUBSCRIPTION_TIERS[org.subscriptionTier]
  
  // Unlimited for Scale tier
  if (tier.limits.trainers === -1) {
    return { allowed: true }
  }

  // Count active users and pending invitations
  const [activeUsers, pendingInvitations] = await Promise.all([
    prisma.user.count({
      where: {
        organizationId,
        role: 'TRAINER',
        active: true,
      },
    }),
    prisma.invitation.count({
      where: {
        organizationId,
        status: 'PENDING',
        role: 'TRAINER',
      },
    }),
  ])

  const totalSlots = activeUsers + pendingInvitations
  
  if (totalSlots >= tier.limits.trainers) {
    return {
      allowed: false,
      reason: `You've reached your limit of ${tier.limits.trainers} team members. Upgrade to ${
        org.subscriptionTier === 'FREE' ? 'Growth' : 'Scale'
      } to invite more.`,
    }
  }

  return {
    allowed: true,
    remaining: tier.limits.trainers - totalSlots,
  }
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(token: string, userId?: string) {
  // Find invitation by token
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: true,
    },
  })

  if (!invitation) {
    throw new Error('Invalid invitation')
  }

  // Check if invitation is still valid
  if (invitation.status !== 'PENDING') {
    throw new Error('This invitation has already been used')
  }

  if (new Date() > invitation.expiresAt) {
    // Mark as expired
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    })
    throw new Error('This invitation has expired')
  }

  // If userId provided, add existing user to organization
  // Otherwise, the user signup flow will handle account creation
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user already belongs to an organization
    if (user.organizationId && user.organizationId !== invitation.organizationId) {
      throw new Error('User already belongs to another organization')
    }

    // Add user to organization
    await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    })
  }

  // Mark invitation as accepted
  const updatedInvitation = await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    },
  })

  // Log acceptance
  await prisma.auditLog.create({
    data: {
      userId: userId || null,
      action: 'INVITATION_ACCEPTED',
      entityType: 'Invitation',
      entityId: invitation.id,
      newValue: {
        acceptedBy: userId,
        acceptedAt: new Date(),
      },
    },
  })

  return updatedInvitation
}

/**
 * Resend an invitation
 */
export async function resendInvitation(invitationId: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
      organization: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.status !== 'PENDING') {
    throw new Error('Can only resend pending invitations')
  }

  // Check cooldown period (5 minutes for testing, can be adjusted)
  const lastSent = invitation.updatedAt
  const cooldownMinutes = 5 // Changed from 24 hours to 5 minutes for easier testing
  const cooldownExpiry = new Date(lastSent.getTime() + cooldownMinutes * 60 * 1000)
  
  if (new Date() < cooldownExpiry) {
    const minutesRemaining = Math.ceil((cooldownExpiry.getTime() - Date.now()) / (60 * 1000))
    throw new Error(`Please wait ${minutesRemaining} minutes before resending`)
  }

  // Generate new token and extend expiration
  const newToken = generateSecureToken()
  const newExpiresAt = new Date()
  newExpiresAt.setDate(newExpiresAt.getDate() + 7)

  // Update invitation
  const updatedInvitation = await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      token: newToken,
      expiresAt: newExpiresAt,
    },
    include: {
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
      organization: {
        select: {
          name: true,
        },
      },
    },
  })

  // Log resend
  await prisma.auditLog.create({
    data: {
      userId: invitation.invitedById,
      action: 'INVITATION_RESENT',
      entityType: 'Invitation',
      entityId: invitation.id,
    },
  })

  return updatedInvitation
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: string, cancelledById: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  })

  if (!invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.status !== 'PENDING') {
    throw new Error('Can only cancel pending invitations')
  }

  // Update status to cancelled
  const updatedInvitation = await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      status: 'CANCELLED',
    },
  })

  // Log cancellation
  await prisma.auditLog.create({
    data: {
      userId: cancelledById,
      action: 'INVITATION_CANCELLED',
      entityType: 'Invitation',
      entityId: invitation.id,
    },
  })

  return updatedInvitation
}

/**
 * Get invitations for an organization
 */
export async function getOrganizationInvitations(
  organizationId: string,
  status?: InvitationStatus
) {
  const where: any = { organizationId }
  if (status) {
    where.status = status
  }

  // Also check for expired invitations
  const invitations = await prisma.invitation.findMany({
    where,
    include: {
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Update expired invitations
  const now = new Date()
  const updatedInvitations = await Promise.all(
    invitations.map(async (inv) => {
      if (inv.status === 'PENDING' && inv.expiresAt < now) {
        return prisma.invitation.update({
          where: { id: inv.id },
          data: { status: 'EXPIRED' },
          include: {
            invitedBy: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        })
      }
      return inv
    })
  )

  return updatedInvitations
}

/**
 * Get invitation by token (for acceptance page)
 */
export async function getInvitationByToken(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          name: true,
          email: true,
        },
      },
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  if (!invitation) {
    return null
  }

  // Check if expired
  if (invitation.status === 'PENDING' && invitation.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    })
    invitation.status = 'EXPIRED'
  }

  return invitation
}

/**
 * Generate secure random token
 */
function generateSecureToken(): string {
  return randomBytes(32).toString('hex')
}