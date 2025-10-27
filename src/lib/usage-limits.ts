import { prisma } from '@/lib/prisma'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'
import { SubscriptionTier } from '@prisma/client'

export interface UsageStats {
  trainers: {
    current: number
    limit: number
    percentage: number
    remaining: number
  }
  sessions: {
    current: number
    limit: number
    percentage: number
    remaining: number
  }
  locations: {
    current: number
    limit: number
    percentage: number
    remaining: number
  }
}

/**
 * Get current usage statistics for an organization
 */
export async function getOrganizationUsage(organizationId: string): Promise<UsageStats> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })

  if (!org) {
    throw new Error('Organization not found')
  }

  // Check for beta access override
  const effectiveTier = (org.betaAccess && org.betaExpiresAt && org.betaExpiresAt > new Date())
    ? 'SCALE'  // Beta users get SCALE tier access
    : org.subscriptionTier
    
  const tier = SUBSCRIPTION_TIERS[effectiveTier]
  const limits = tier.limits

  // Get current counts
  const [trainersCount, locationsCount, sessionsCount] = await Promise.all([
    prisma.user.count({
      where: {
        organizationId,
        role: 'TRAINER',
        active: true,
      },
    }),
    prisma.location.count({
      where: {
        organizationId,
        active: true,
      },
    }),
    // Sessions for current month
    prisma.session.count({
      where: {
        trainer: {
          organizationId,
        },
        sessionDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
      },
    }),
  ])

  const calculateUsage = (current: number, limit: number) => {
    const isUnlimited = limit === -1
    return {
      current,
      limit: isUnlimited ? -1 : limit,
      percentage: isUnlimited ? 0 : Math.round((current / limit) * 100),
      remaining: isUnlimited ? -1 : Math.max(0, limit - current),
    }
  }

  return {
    trainers: calculateUsage(trainersCount, limits.trainers),
    sessions: calculateUsage(sessionsCount, limits.sessionsPerMonth),
    locations: calculateUsage(locationsCount, limits.locations),
  }
}

/**
 * Check if organization can add more trainers
 */
export async function canAddTrainer(organizationId: string): Promise<{
  allowed: boolean
  reason?: string
  usage?: UsageStats['trainers']
}> {
  const usage = await getOrganizationUsage(organizationId)
  
  if (usage.trainers.limit === -1) {
    return { allowed: true, usage: usage.trainers }
  }

  if (usage.trainers.current >= usage.trainers.limit) {
    return {
      allowed: false,
      reason: `You've reached your limit of ${usage.trainers.limit} trainers. Upgrade to add more.`,
      usage: usage.trainers,
    }
  }

  return { allowed: true, usage: usage.trainers }
}

/**
 * Check if organization can create more sessions
 */
export async function canCreateSession(organizationId: string): Promise<{
  allowed: boolean
  reason?: string
  usage?: UsageStats['sessions']
}> {
  const usage = await getOrganizationUsage(organizationId)
  
  // FIRST: Check if organization exceeds trainer limits
  if (usage.trainers.limit !== -1 && usage.trainers.current > usage.trainers.limit) {
    return {
      allowed: false,
      reason: `Your organization has ${usage.trainers.current} trainers but your plan allows only ${usage.trainers.limit}. Please deactivate ${usage.trainers.current - usage.trainers.limit} trainer(s) or upgrade your plan to continue logging sessions.`,
      usage: usage.sessions,
    }
  }
  
  // SECOND: Check if organization exceeds location limits
  if (usage.locations.limit !== -1 && usage.locations.current > usage.locations.limit) {
    return {
      allowed: false,
      reason: `Your organization has ${usage.locations.current} locations but your plan allows only ${usage.locations.limit}. Please deactivate ${usage.locations.current - usage.locations.limit} location(s) or upgrade your plan to continue logging sessions.`,
      usage: usage.sessions,
    }
  }
  
  // THIRD: Check session limits
  if (usage.sessions.limit === -1) {
    return { allowed: true, usage: usage.sessions }
  }

  if (usage.sessions.current >= usage.sessions.limit) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${usage.sessions.limit} sessions. Upgrade for more.`,
      usage: usage.sessions,
    }
  }

  return { allowed: true, usage: usage.sessions }
}

/**
 * Check if organization can add more locations
 */
export async function canAddLocation(organizationId: string): Promise<{
  allowed: boolean
  reason?: string
  usage?: UsageStats['locations']
}> {
  const usage = await getOrganizationUsage(organizationId)
  
  if (usage.locations.limit === -1) {
    return { allowed: true, usage: usage.locations }
  }

  if (usage.locations.current >= usage.locations.limit) {
    return {
      allowed: false,
      reason: `You've reached your limit of ${usage.locations.limit} locations. Upgrade to add more.`,
      usage: usage.locations,
    }
  }

  return { allowed: true, usage: usage.locations }
}

/**
 * Check if usage is approaching limits (80% or more)
 */
export function isApproachingLimit(usage: { current: number; limit: number }): boolean {
  if (usage.limit === -1) return false
  return usage.current >= usage.limit * 0.8
}

/**
 * Get upgrade recommendation based on usage
 */
export function getUpgradeRecommendation(
  currentTier: SubscriptionTier,
  usage: UsageStats
): SubscriptionTier | null {
  // Already on highest tier
  if (currentTier === 'SCALE') {
    return null
  }

  // Check if any resource is at or above 80% usage
  const needsUpgrade = 
    isApproachingLimit(usage.trainers) ||
    isApproachingLimit(usage.sessions) ||
    isApproachingLimit(usage.locations)

  if (!needsUpgrade) {
    return null
  }

  // Recommend next tier up
  if (currentTier === 'FREE') {
    // Check if GROWTH would be sufficient
    const growthTier = SUBSCRIPTION_TIERS.GROWTH
    const needsScale = 
      usage.trainers.current > growthTier.limits.trainers ||
      usage.sessions.current > growthTier.limits.sessionsPerMonth ||
      usage.locations.current > growthTier.limits.locations

    return needsScale ? 'SCALE' : 'GROWTH'
  }

  // If on GROWTH, recommend SCALE
  return 'SCALE'
}

/**
 * Check if a specific trainer can log sessions
 * This checks organization limits (not individual suspension)
 */
export async function canTrainerLogSessions(
  trainerId: string,
  organizationId: string
): Promise<{
  allowed: boolean
  reason?: string
  usage?: UsageStats['sessions']
}> {
  // Check if trainer exists and is active
  const trainer = await prisma.user.findUnique({
    where: { id: trainerId },
    select: { 
      active: true,
      organizationId: true
    }
  })
  
  if (!trainer) {
    return { 
      allowed: false, 
      reason: 'Trainer not found' 
    }
  }
  
  if (!trainer.active) {
    return { 
      allowed: false, 
      reason: 'Your account is inactive' 
    }
  }
  
  if (trainer.organizationId !== organizationId) {
    return {
      allowed: false,
      reason: 'Trainer belongs to different organization'
    }
  }
  
  // Check organization limits (this will block if over trainer/location limits)
  const canCreate = await canCreateSession(organizationId)
  return canCreate
}

/**
 * Check if a location can be used for sessions
 * This checks organization limits (not individual suspension)
 */
export async function canUseLocation(
  locationId: string,
  organizationId: string
): Promise<{
  allowed: boolean
  reason?: string
}> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { 
      active: true,
      organizationId: true
    }
  })
  
  if (!location) {
    return {
      allowed: false,
      reason: 'Location not found'
    }
  }
  
  if (location.organizationId !== organizationId) {
    return {
      allowed: false,
      reason: 'Location belongs to different organization'
    }
  }
  
  if (!location.active) {
    return {
      allowed: false,
      reason: 'Location is inactive'
    }
  }
  
  // Check organization limits (this will block if over trainer/location limits)
  const canCreate = await canCreateSession(organizationId)
  if (!canCreate.allowed) {
    return {
      allowed: false,
      reason: canCreate.reason
    }
  }
  
  return { allowed: true }
}
