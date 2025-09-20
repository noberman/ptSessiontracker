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
 * Ensures commission tiers exist in the database
 * @returns true if tiers were created, false if they already existed
 */
export async function ensureCommissionTiers(): Promise<boolean> {
  try {
    // Check if any tiers exist
    const existingTiers = await prisma.commissionTier.count()
    
    if (existingTiers > 0) {
      console.log(`✅ Commission tiers already exist (${existingTiers} tiers)`)
      return false
    }
    
    console.log('📊 No commission tiers found, creating defaults...')
    
    // Create default tiers
    await prisma.commissionTier.createMany({
      data: DEFAULT_COMMISSION_TIERS.map(tier => ({
        minSessions: tier.minSessions,
        maxSessions: tier.maxSessions,
        percentage: tier.percentage
      }))
    })
    
    console.log('✅ Default commission tiers created successfully')
    return true
    
  } catch (error) {
    console.error('❌ Error ensuring commission tiers:', error)
    return false
  }
}

/**
 * Get commission tiers, creating defaults if none exist
 * This ensures there are always tiers available
 */
export async function getOrCreateCommissionTiers() {
  // First ensure tiers exist
  await ensureCommissionTiers()
  
  // Then return them
  const tiers = await prisma.commissionTier.findMany({
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