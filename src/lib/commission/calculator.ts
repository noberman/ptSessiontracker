/**
 * Commission Calculator
 * Supports Progressive and Graduated tier systems
 */

import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'
import { getOrCreateCommissionTiers } from './ensure-tiers'

export type CommissionMethod = 'PROGRESSIVE' | 'GRADUATED'

export interface CommissionTier {
  minSessions: number
  maxSessions: number | null
  percentage: number
}

export interface TrainerCommission {
  trainerId: string
  trainerName: string
  trainerEmail: string
  locationId: string | null
  locationName: string | null
  totalSessions: number
  totalValue: number
  validatedSessions: number
  tierAchieved?: CommissionTier
  tiersApplied?: Array<{
    tier: CommissionTier
    sessions: number
    value: number
    commission: number
  }>
  commissionRate: number
  commissionAmount: number
  method: CommissionMethod
}

/**
 * Get commission tiers from database
 */
async function getCommissionTiers(): Promise<CommissionTier[]> {
  console.log('🔍 CALCULATOR: Getting commission tiers...')
  
  // Use getOrCreateCommissionTiers which will ensure tiers exist
  const tiers = await getOrCreateCommissionTiers()
  
  console.log('✅ CALCULATOR: Tiers loaded successfully:', tiers.map(t => `${t.minSessions}-${t.maxSessions || '∞'}:${t.percentage}%`).join(', '))
  
  return tiers
}

/**
 * Calculate commission using Progressive Tier method
 * The achieved tier rate applies to ALL sessions
 */
function calculateProgressiveTier(
  sessionCount: number,
  totalValue: number,
  tiers: CommissionTier[]
): {
  tierAchieved: CommissionTier
  commissionRate: number
  commissionAmount: number
} {
  // Find the tier this trainer has achieved based on session count
  const tierAchieved = tiers
    .slice()
    .reverse()
    .find(tier => sessionCount >= tier.minSessions) || tiers[0]
  
  const commissionRate = tierAchieved.percentage
  const commissionAmount = (totalValue * commissionRate) / 100
  
  return {
    tierAchieved,
    commissionRate,
    commissionAmount
  }
}

/**
 * Calculate commission using Graduated Tier method (Tax Bracket style)
 * Different rates apply to different brackets of sessions
 */
function calculateGraduatedTier(
  sessions: Array<{ sessionValue: number }>,
  tiers: CommissionTier[]
): {
  tiersApplied: Array<{
    tier: CommissionTier
    sessions: number
    value: number
    commission: number
  }>
  commissionRate: number
  commissionAmount: number
} {
  const tiersApplied: Array<{
    tier: CommissionTier
    sessions: number
    value: number
    commission: number
  }> = []
  
  let sessionsProcessed = 0
  let totalCommission = 0
  let totalValue = 0
  
  // Sort sessions by value (optional: could be by date or keep original order)
  const sortedSessions = [...sessions]
  
  for (const tier of tiers) {
    const tierMin = tier.minSessions
    const tierMax = tier.maxSessions || Infinity
    
    // How many sessions fall into this tier bracket?
    const sessionsInTier = Math.min(
      Math.max(0, sortedSessions.length - tierMin + 1),
      tierMax - tierMin + 1
    )
    
    if (sessionsInTier > 0 && sessionsProcessed < sortedSessions.length) {
      // Get the sessions for this tier
      const tierSessions = sortedSessions.slice(
        sessionsProcessed,
        sessionsProcessed + sessionsInTier
      )
      
      const tierValue = tierSessions.reduce((sum, s) => sum + s.sessionValue, 0)
      const tierCommission = (tierValue * tier.percentage) / 100
      
      tiersApplied.push({
        tier,
        sessions: tierSessions.length,
        value: tierValue,
        commission: tierCommission
      })
      
      totalValue += tierValue
      totalCommission += tierCommission
      sessionsProcessed += tierSessions.length
    }
    
    if (sessionsProcessed >= sortedSessions.length) break
  }
  
  const effectiveRate = totalValue > 0 ? (totalCommission / totalValue) * 100 : 0
  
  return {
    tiersApplied,
    commissionRate: effectiveRate,
    commissionAmount: totalCommission
  }
}

/**
 * Calculate commission for a single trainer for a given month
 */
export async function calculateTrainerCommission(
  trainerId: string,
  month: Date,
  method: CommissionMethod = 'PROGRESSIVE'
): Promise<TrainerCommission | null> {
  const startDate = startOfMonth(month)
  const endDate = endOfMonth(month)
  
  // Get trainer info
  const trainer = await prisma.user.findUnique({
    where: { id: trainerId },
    include: {
      location: true
    }
  })
  
  if (!trainer) return null
  
  // Get validated sessions for the month
  const sessions = await prisma.session.findMany({
    where: {
      trainerId,
      sessionDate: {
        gte: startDate,
        lte: endDate
      },
      validated: true,
      cancelled: false
    },
    orderBy: {
      sessionDate: 'asc'
    }
  })
  
  const totalSessions = sessions.length
  const validatedSessions = sessions.filter(s => s.validated).length
  const totalValue = sessions.reduce((sum, s) => sum + s.sessionValue, 0)
  
  // Get commission tiers
  const tiers = await getCommissionTiers()
  
  const commissionData: Partial<TrainerCommission> = {
    trainerId,
    trainerName: trainer.name,
    trainerEmail: trainer.email,
    locationId: trainer.locationId,
    locationName: trainer.location?.name || null,
    totalSessions,
    validatedSessions,
    totalValue,
    method
  }
  
  if (totalSessions === 0) {
    return {
      ...commissionData,
      commissionRate: 0,
      commissionAmount: 0
    } as TrainerCommission
  }
  
  if (method === 'PROGRESSIVE') {
    const progressive = calculateProgressiveTier(totalSessions, totalValue, tiers)
    return {
      ...commissionData,
      tierAchieved: progressive.tierAchieved,
      commissionRate: progressive.commissionRate,
      commissionAmount: progressive.commissionAmount
    } as TrainerCommission
  } else {
    const graduated = calculateGraduatedTier(sessions, tiers)
    return {
      ...commissionData,
      tiersApplied: graduated.tiersApplied,
      commissionRate: graduated.commissionRate,
      commissionAmount: graduated.commissionAmount
    } as TrainerCommission
  }
}

/**
 * Calculate commission for all trainers for a given month
 */
export async function calculateMonthlyCommissions(
  month: Date,
  locationId?: string,
  method: CommissionMethod = 'PROGRESSIVE',
  organizationId?: string
): Promise<TrainerCommission[]> {
  // Get all active trainers (optionally filtered by location and organization)
  const trainers = await prisma.user.findMany({
    where: {
      role: 'TRAINER',
      active: true,
      ...(locationId && { locationId }),
      ...(organizationId && { organizationId })
    }
  })
  
  const commissions: TrainerCommission[] = []
  
  for (const trainer of trainers) {
    const commission = await calculateTrainerCommission(trainer.id, month, method)
    if (commission) {
      commissions.push(commission)
    }
  }
  
  // Sort by commission amount descending
  return commissions.sort((a, b) => b.commissionAmount - a.commissionAmount)
}

/**
 * Get commission method setting (later this will come from organization settings)
 * For now, returns a default or environment-based setting
 */
export async function getCommissionMethod(): Promise<CommissionMethod> {
  // TODO: In Phase 2, this will read from organization settings
  // For MVP, we can use an environment variable or default
  return (process.env.COMMISSION_METHOD as CommissionMethod) || 'PROGRESSIVE'
}

/**
 * Format commission data for Excel export
 */
export function formatCommissionForExport(commissions: TrainerCommission[]) {
  return commissions.map(c => ({
    'Trainer Name': c.trainerName,
    'Email': c.trainerEmail,
    'Location': c.locationName || 'N/A',
    'Total Sessions': c.totalSessions,
    'Validated Sessions': c.validatedSessions,
    'Total Value': `$${c.totalValue.toFixed(2)}`,
    'Commission Rate': `${c.commissionRate.toFixed(1)}%`,
    'Commission Amount': `$${c.commissionAmount.toFixed(2)}`,
    'Method': c.method === 'PROGRESSIVE' ? 'Progressive Tier' : 'Graduated Tier',
    ...(c.tierAchieved && {
      'Tier Achieved': `${c.tierAchieved.minSessions}-${c.tierAchieved.maxSessions || '+'} sessions (${c.tierAchieved.percentage}%)`
    })
  }))
}