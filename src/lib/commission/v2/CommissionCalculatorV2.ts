import { prisma } from '@/lib/prisma'
import { 
  CalculationMethod, 
  TriggerType,
  type CommissionProfile,
  type CommissionTierV2,
  type Session,
  type Package,
  type CommissionCalculation
} from '@prisma/client'

interface CalculationResult {
  sessionCommission: number
  salesCommission: number
  tierBonus: number
  totalCommission: number
  tierReached: number
  calculationSnapshot: any
}

interface ProfileWithTiers extends CommissionProfile {
  tiers: CommissionTierV2[]
}

export class CommissionCalculatorV2 {
  /**
   * Calculate commission for a trainer for a given period
   * @param userId - The trainer's user ID
   * @param period - The date range for calculation
   * @param options - Optional settings:
   *   - saveCalculation: Whether to save the calculation to database (default: true)
   *   - locationId: Filter sessions by location (optional - if not provided, includes all locations)
   */
  async calculateCommission(
    userId: string,
    period: { start: Date; end: Date },
    options: { saveCalculation?: boolean; locationId?: string } = { saveCalculation: true }
  ): Promise<CommissionCalculation> {
    // Get user with profile and organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        commissionProfile: {
          include: {
            tiers: {
              orderBy: { tierLevel: 'asc' }
            }
          }
        }
      }
    })
    
    if (!user) {
      throw new Error(`User ${userId} not found`)
    }
    
    if (!user.organizationId) {
      throw new Error(`User ${userId} has no organization`)
    }
    
    if (!user.commissionProfile) {
      throw new Error(`User ${userId} has no commission profile assigned`)
    }
    
    // Get validated sessions for the period (optionally filtered by location)
    const sessions = await prisma.session.findMany({
      where: {
        trainerId: userId,
        sessionDate: {
          gte: period.start,
          lte: period.end
        },
        validated: true,
        cancelled: false,
        ...(options.locationId ? { locationId: options.locationId } : {})
      },
      orderBy: {
        sessionDate: 'asc'
      }
    })
    
    // Get package sales for the period (packages sold by this trainer)
    const packages = await prisma.package.findMany({
      where: {
        client: {
          primaryTrainerId: userId
        },
        createdAt: {
          gte: period.start,
          lte: period.end
        },
        active: true
      }
    })
    
    // Calculate commission based on the profile's calculation method
    const result = this.calculateByMethod(
      user.commissionProfile,
      sessions,
      packages
    )
    
    // Save calculation to database if requested
    if (options.saveCalculation) {
      const calculation = await prisma.commissionCalculation.create({
        data: {
          userId,
          organizationId: user.organizationId,
          profileId: user.commissionProfileId,
          periodStart: period.start,
          periodEnd: period.end,
          calculationMethod: user.commissionProfile.calculationMethod,
          totalSessions: sessions.length,
          totalPackagesSold: packages.length,
          sessionCommission: result.sessionCommission,
          salesCommission: result.salesCommission,
          tierBonus: result.tierBonus,
          totalCommission: result.totalCommission,
          tierReached: result.tierReached,
          calculationSnapshot: result.calculationSnapshot
        }
      })
      
      return calculation
    }
    
    // Return unsaved calculation
    return {
      id: '',
      userId,
      organizationId: user.organizationId,
      profileId: user.commissionProfileId,
      periodStart: period.start,
      periodEnd: period.end,
      calculationMethod: user.commissionProfile.calculationMethod,
      totalSessions: sessions.length,
      totalPackagesSold: packages.length,
      sessionCommission: result.sessionCommission,
      salesCommission: result.salesCommission,
      tierBonus: result.tierBonus,
      totalCommission: result.totalCommission,
      tierReached: result.tierReached,
      calculationSnapshot: result.calculationSnapshot,
      calculatedAt: new Date()
    } as CommissionCalculation
  }
  
  /**
   * Calculate commission based on the profile's method
   */
  private calculateByMethod(
    profile: ProfileWithTiers,
    sessions: Session[],
    packages: Package[]
  ): CalculationResult {
    switch (profile.calculationMethod) {
      case CalculationMethod.PROGRESSIVE:
        return this.calculateProgressive(profile, sessions, packages)
      case CalculationMethod.GRADUATED:
        return this.calculateGraduated(profile, sessions, packages)
      case CalculationMethod.FLAT:
        return this.calculateFlat(profile, sessions, packages)
      default:
        throw new Error(`Unknown calculation method: ${profile.calculationMethod}`)
    }
  }
  
  /**
   * PROGRESSIVE: All sessions at the highest tier rate achieved
   */
  private calculateProgressive(
    profile: ProfileWithTiers,
    sessions: Session[],
    packages: Package[]
  ): CalculationResult {
    // Find the highest tier achieved
    const currentTier = this.determineCurrentTier(
      profile,
      sessions.length,
      this.calculateTotalSalesValue(packages)
    )
    
    // Calculate commission using the highest tier's rewards
    let sessionCommission = 0
    let salesCommission = 0
    
    // Session commission
    if (currentTier.sessionFlatFee) {
      // Flat fee per session
      sessionCommission = sessions.length * currentTier.sessionFlatFee
    } else if (currentTier.sessionCommissionPercent) {
      // Percentage of session value
      const totalSessionValue = sessions.reduce((sum, s) => sum + s.sessionValue, 0)
      sessionCommission = totalSessionValue * (currentTier.sessionCommissionPercent / 100)
    }
    
    // Sales commission
    if (currentTier.salesFlatFee) {
      // Flat fee per package
      salesCommission = packages.length * currentTier.salesFlatFee
    } else if (currentTier.salesCommissionPercent) {
      // Percentage of package value
      const totalSalesValue = this.calculateTotalSalesValue(packages)
      salesCommission = totalSalesValue * (currentTier.salesCommissionPercent / 100)
    }
    
    // Tier bonus (one-time bonus for reaching this tier)
    const tierBonus = currentTier.tierBonus || 0
    
    return {
      sessionCommission,
      salesCommission,
      tierBonus,
      totalCommission: sessionCommission + salesCommission + tierBonus,
      tierReached: currentTier.tierLevel,
      calculationSnapshot: {
        method: 'PROGRESSIVE',
        tierUsed: `Tier ${currentTier.tierLevel}`,
        tierLevel: currentTier.tierLevel,
        sessionCount: sessions.length,
        packageCount: packages.length,
        rates: {
          sessionFlatFee: currentTier.sessionFlatFee,
          sessionCommissionPercent: currentTier.sessionCommissionPercent,
          salesFlatFee: currentTier.salesFlatFee,
          salesCommissionPercent: currentTier.salesCommissionPercent,
          tierBonus: currentTier.tierBonus
        }
      }
    }
  }
  
  /**
   * GRADUATED: Each tier applies to its range of sessions
   */
  private calculateGraduated(
    profile: ProfileWithTiers,
    sessions: Session[],
    packages: Package[]
  ): CalculationResult {
    let sessionCommission = 0
    let remainingSessions = sessions.length
    let sessionIndex = 0
    
    // Sort tiers by level
    const sortedTiers = [...profile.tiers].sort((a, b) => a.tierLevel - b.tierLevel)
    
    // Apply each tier to its range of sessions
    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i]
      const nextTier = sortedTiers[i + 1]
      
      // Determine how many sessions this tier applies to
      const tierStartThreshold = tier.sessionThreshold || 0
      const tierEndThreshold = nextTier?.sessionThreshold || Infinity
      const sessionsInThisTier = Math.min(
        Math.max(0, sessions.length - tierStartThreshold),
        tierEndThreshold - tierStartThreshold
      )
      
      if (sessionsInThisTier > 0) {
        // Calculate commission for sessions in this tier
        const tierSessions = sessions.slice(sessionIndex, sessionIndex + sessionsInThisTier)
        
        if (tier.sessionFlatFee) {
          sessionCommission += sessionsInThisTier * tier.sessionFlatFee
        } else if (tier.sessionCommissionPercent) {
          const tierSessionValue = tierSessions.reduce((sum, s) => sum + s.sessionValue, 0)
          sessionCommission += tierSessionValue * (tier.sessionCommissionPercent / 100)
        }
        
        sessionIndex += sessionsInThisTier
        remainingSessions -= sessionsInThisTier
      }
      
      if (remainingSessions <= 0) break
    }
    
    // Sales commission uses the highest tier achieved
    const currentTier = this.determineCurrentTier(
      profile,
      sessions.length,
      this.calculateTotalSalesValue(packages)
    )
    
    let salesCommission = 0
    if (currentTier.salesFlatFee) {
      salesCommission = packages.length * currentTier.salesFlatFee
    } else if (currentTier.salesCommissionPercent) {
      const totalSalesValue = this.calculateTotalSalesValue(packages)
      salesCommission = totalSalesValue * (currentTier.salesCommissionPercent / 100)
    }
    
    const tierBonus = currentTier.tierBonus || 0
    
    return {
      sessionCommission,
      salesCommission,
      tierBonus,
      totalCommission: sessionCommission + salesCommission + tierBonus,
      tierReached: currentTier.tierLevel,
      calculationSnapshot: {
        method: 'GRADUATED',
        tierReached: `Tier ${currentTier.tierLevel}`,
        tierLevel: currentTier.tierLevel,
        sessionCount: sessions.length,
        packageCount: packages.length,
        tierBreakdown: sortedTiers.map(tier => ({
          tierLevel: tier.tierLevel,
          tierName: `Tier ${tier.tierLevel}`,
          sessionThreshold: tier.sessionThreshold,
          rates: {
            sessionFlatFee: tier.sessionFlatFee,
            sessionCommissionPercent: tier.sessionCommissionPercent
          }
        }))
      }
    }
  }
  
  /**
   * FLAT: Same rate for all sessions (uses tier 1 only)
   */
  private calculateFlat(
    profile: ProfileWithTiers,
    sessions: Session[],
    packages: Package[]
  ): CalculationResult {
    // For flat method, use the first tier's rates for everything
    const flatTier = profile.tiers.find(t => t.tierLevel === 1) || profile.tiers[0]
    
    if (!flatTier) {
      throw new Error('No tier found for flat calculation')
    }
    
    let sessionCommission = 0
    let salesCommission = 0
    
    // Session commission
    if (flatTier.sessionFlatFee) {
      sessionCommission = sessions.length * flatTier.sessionFlatFee
    } else if (flatTier.sessionCommissionPercent) {
      const totalSessionValue = sessions.reduce((sum, s) => sum + s.sessionValue, 0)
      sessionCommission = totalSessionValue * (flatTier.sessionCommissionPercent / 100)
    }
    
    // Sales commission
    if (flatTier.salesFlatFee) {
      salesCommission = packages.length * flatTier.salesFlatFee
    } else if (flatTier.salesCommissionPercent) {
      const totalSalesValue = this.calculateTotalSalesValue(packages)
      salesCommission = totalSalesValue * (flatTier.salesCommissionPercent / 100)
    }
    
    return {
      sessionCommission,
      salesCommission,
      tierBonus: 0, // No tier bonuses in flat method
      totalCommission: sessionCommission + salesCommission,
      tierReached: 1,
      calculationSnapshot: {
        method: 'FLAT',
        tierUsed: `Tier ${flatTier.tierLevel}`,
        sessionCount: sessions.length,
        packageCount: packages.length,
        rates: {
          sessionFlatFee: flatTier.sessionFlatFee,
          sessionCommissionPercent: flatTier.sessionCommissionPercent,
          salesFlatFee: flatTier.salesFlatFee,
          salesCommissionPercent: flatTier.salesCommissionPercent
        }
      }
    }
  }
  
  /**
   * Determine which tier a trainer has reached based on triggers
   */
  private determineCurrentTier(
    profile: ProfileWithTiers,
    sessionCount: number,
    salesVolume: number
  ): CommissionTierV2 {
    // Sort tiers by level (highest to lowest)
    const sortedTiers = [...profile.tiers].sort((a, b) => b.tierLevel - a.tierLevel)
    
    // Find the highest tier whose triggers are met
    for (const tier of sortedTiers) {
      const meetsRequirement = this.checkTierTrigger(profile, tier, sessionCount, salesVolume)
      if (meetsRequirement) {
        return tier
      }
    }
    
    // Return the lowest tier if no triggers are met
    return profile.tiers.find(t => t.tierLevel === 1) || profile.tiers[0]
  }
  
  /**
   * Check if a tier's trigger conditions are met
   */
  private checkTierTrigger(
    profile: ProfileWithTiers,
    tier: CommissionTierV2,
    sessionCount: number,
    salesVolume: number
  ): boolean {
    switch (profile.triggerType) {
      case TriggerType.NONE:
        // Always meets requirement (base tier)
        return true
        
      case TriggerType.SESSION_COUNT:
        // Must meet session threshold
        return sessionCount >= (tier.sessionThreshold || 0)
        
      case TriggerType.SALES_VOLUME:
        // Must meet sales threshold
        return salesVolume >= (tier.salesThreshold || 0)
        
      case TriggerType.EITHER_OR:
        // Must meet either session OR sales threshold
        const meetsSession = tier.sessionThreshold ? sessionCount >= tier.sessionThreshold : false
        const meetsSales = tier.salesThreshold ? salesVolume >= tier.salesThreshold : false
        return meetsSession || meetsSales
        
      case TriggerType.BOTH_AND:
        // Must meet both session AND sales thresholds
        const needsSession = tier.sessionThreshold ? sessionCount >= tier.sessionThreshold : true
        const needsSales = tier.salesThreshold ? salesVolume >= tier.salesThreshold : true
        return needsSession && needsSales
        
      default:
        return false
    }
  }
  
  /**
   * Calculate total value of packages
   */
  private calculateTotalSalesValue(packages: Package[]): number {
    return packages.reduce((sum, pkg) => sum + pkg.totalValue, 0)
  }
  
  /**
   * Get commission calculation history for a trainer
   */
  async getCalculationHistory(
    userId: string,
    limit: number = 12
  ): Promise<CommissionCalculation[]> {
    return await prisma.commissionCalculation.findMany({
      where: { userId },
      orderBy: { periodEnd: 'desc' },
      take: limit,
      include: {
        profile: {
          select: {
            name: true
          }
        }
      }
    })
  }
  
  /**
   * Calculate commission for all trainers in an organization
   */
  async calculateOrganizationCommissions(
    organizationId: string,
    period: { start: Date; end: Date }
  ): Promise<CommissionCalculation[]> {
    // Get all trainers in the organization
    const trainers = await prisma.user.findMany({
      where: {
        organizationId,
        role: 'TRAINER',
        active: true,
        commissionProfileId: { not: null }
      }
    })
    
    const calculations: CommissionCalculation[] = []
    
    for (const trainer of trainers) {
      try {
        const calculation = await this.calculateCommission(
          trainer.id,
          period,
          { saveCalculation: true }
        )
        calculations.push(calculation)
      } catch (error) {
        console.error(`Failed to calculate commission for ${trainer.name}:`, error)
      }
    }
    
    return calculations
  }
}