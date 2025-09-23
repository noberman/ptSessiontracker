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

  const tier = SUBSCRIPTION_TIERS[org.subscriptionTier]
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
  if (currentTier === 'PRO') {
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
    const needsPro = 
      usage.trainers.current > growthTier.limits.trainers ||
      usage.sessions.current > growthTier.limits.sessionsPerMonth ||
      usage.locations.current > growthTier.limits.locations

    return needsPro ? 'PRO' : 'GROWTH'
  }

  // If on GROWTH, recommend PRO
  return 'PRO'
}