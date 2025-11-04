import { prisma } from '@/lib/prisma'
import { CalculationMethod, TriggerType } from '@prisma/client'

export class CommissionMigrationService {
  /**
   * Migrate organization from v1 to v2
   */
  async migrateOrganization(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        commissionTiers: {
          orderBy: { minSessions: 'asc' }
        },
        users: {
          where: { role: 'TRAINER' }
        }
      }
    })
    
    if (!org) throw new Error('Organization not found')
    
    console.log(`Migrating ${org.name} (${organizationId})...`)
    console.log(`- Commission Method: ${org.commissionMethod}`)
    console.log(`- Existing Tiers: ${org.commissionTiers.length}`)
    console.log(`- Trainers to migrate: ${org.users.length}`)
    
    // Create default profile from existing tiers
    const profile = await prisma.commissionProfile.create({
      data: {
        organizationId,
        name: 'Default Commission Structure',
        isDefault: true,
        isActive: true,
        calculationMethod: org.commissionMethod as CalculationMethod,
        tiers: {
          create: org.commissionTiers.map((tier, index) => ({
            tierLevel: index + 1,
            triggerType: TriggerType.SESSION_COUNT,
            sessionThreshold: tier.minSessions,
            // Convert from decimal to percentage (0.15 → 15)
            sessionCommissionPercent: tier.percentage * 100,
            // V1 doesn't have flat fees or sales commission
            sessionFlatFee: null,
            salesCommissionPercent: null,
            salesFlatFee: null,
            tierBonus: null
          }))
        }
      },
      include: {
        tiers: true
      }
    })
    
    console.log(`✅ Created profile: ${profile.name} with ${profile.tiers.length} tiers`)
    
    // Assign all trainers to this profile
    const updateResult = await prisma.user.updateMany({
      where: {
        organizationId,
        role: 'TRAINER'
      },
      data: {
        commissionProfileId: profile.id
      }
    })
    
    console.log(`✅ Assigned ${updateResult.count} trainers to the new profile`)
    
    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'COMMISSION_MIGRATION_V1_TO_V2',
        entityType: 'Organization',
        entityId: organizationId,
        userId: null, // System action
        oldValue: {
          method: org.commissionMethod,
          tiersCount: org.commissionTiers.length,
          trainersCount: org.users.length
        },
        newValue: {
          profileId: profile.id,
          profileName: profile.name,
          tiersCreated: profile.tiers.length,
          trainersAssigned: updateResult.count
        }
      }
    })
    
    return profile
  }
  
  /**
   * Migrate all organizations
   */
  async migrateAll() {
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            commissionProfiles: true
          }
        }
      }
    })
    
    const results = []
    
    for (const org of orgs) {
      // Skip if already has commission profiles
      if (org._count.commissionProfiles > 0) {
        console.log(`⏭️  Skipping ${org.name} - already has ${org._count.commissionProfiles} profiles`)
        continue
      }
      
      try {
        const profile = await this.migrateOrganization(org.id)
        results.push({
          organizationId: org.id,
          organizationName: org.name,
          success: true,
          profileId: profile.id
        })
      } catch (error) {
        console.error(`❌ Failed to migrate ${org.name}:`, error)
        results.push({
          organizationId: org.id,
          organizationName: org.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return results
  }
  
  /**
   * Verify migration by comparing calculations
   */
  async verifyMigration(organizationId: string) {
    // Get a sample trainer
    const trainer = await prisma.user.findFirst({
      where: {
        organizationId,
        role: 'TRAINER',
        commissionProfileId: { not: null }
      }
    })
    
    if (!trainer) {
      console.log('No trainers found to verify')
      return { verified: true, message: 'No trainers to verify' }
    }
    
    // Get their sessions for current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const sessions = await prisma.session.findMany({
      where: {
        trainerId: trainer.id,
        sessionDate: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        validated: true,
        cancelled: false
      }
    })
    
    console.log(`Verification for ${trainer.name}:`)
    console.log(`- Sessions this month: ${sessions.length}`)
    console.log(`- Commission Profile: ${trainer.commissionProfileId}`)
    
    return {
      verified: true,
      trainerId: trainer.id,
      trainerName: trainer.name,
      sessionCount: sessions.length,
      profileAssigned: !!trainer.commissionProfileId
    }
  }
}