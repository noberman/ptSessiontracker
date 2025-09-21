/**
 * Ensures commission tiers exist in the database
 * Creates default tiers if none exist
 * Called on app startup and when accessing commission features
 */

import { prisma } from '@/lib/prisma'

export interface DefaultTier {
  minSessions: number
  maxSessions: number | null
  percentage: number
}

// Default commission structure for new organizations
export const DEFAULT_COMMISSION_TIERS: DefaultTier[] = [
  { minSessions: 0, maxSessions: 30, percentage: 25 },
  { minSessions: 31, maxSessions: 60, percentage: 30 },
  { minSessions: 61, maxSessions: null, percentage: 35 }
]

/**
 * Ensures commission tiers exist for an organization in the database
 * @returns true if tiers were created, false if they already existed
 */
export async function ensureCommissionTiers(organizationId?: string): Promise<boolean> {
  try {
    // If no organizationId provided, we can't proceed
    if (!organizationId) {
      console.log('⚠️  No organizationId provided, skipping tier creation')
      return false
    }
    
    // Check if any tiers exist for this organization
    const existingTiers = await prisma.commissionTier.count({
      where: { organizationId }
    })
    
    if (existingTiers > 0) {
      console.log(`✅ Commission tiers already exist for org ${organizationId} (${existingTiers} tiers)`)
      return false
    }
    
    console.log(`📊 No commission tiers found for org ${organizationId}, creating defaults...`)
    
    // Create default tiers for this organization
    await prisma.commissionTier.createMany({
      data: DEFAULT_COMMISSION_TIERS.map(tier => ({
        minSessions: tier.minSessions,
        maxSessions: tier.maxSessions,
        percentage: tier.percentage,
        organizationId
      }))
    })
    
    console.log(`✅ Default commission tiers created successfully for org ${organizationId}`)
    return true
    
  } catch (error) {
    console.error('❌ Error ensuring commission tiers:', error)
    return false
  }
}

/**
 * Get commission tiers for an organization, creating defaults if none exist
 * This ensures there are always tiers available
 */
export async function getOrCreateCommissionTiers(organizationId?: string) {
  // First ensure tiers exist for this organization
  if (organizationId) {
    await ensureCommissionTiers(organizationId)
  }
  
  // Then return them
  const tiers = await prisma.commissionTier.findMany({
    where: organizationId ? { organizationId } : undefined,
    orderBy: { minSessions: 'asc' }
  })
  
  // If still no tiers (database issue), return defaults from memory
  if (tiers.length === 0) {
    console.warn('⚠️  Using in-memory defaults as fallback')
    return DEFAULT_COMMISSION_TIERS
  }
  
  return tiers.map(tier => ({
    minSessions: tier.minSessions,
    maxSessions: tier.maxSessions,
    percentage: tier.percentage
  }))
}