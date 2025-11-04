#!/usr/bin/env tsx
/**
 * Migration script to convert v1 commission system to v2
 * 
 * Usage: npm run migrate:commissions
 */

import { prisma } from '@/lib/prisma'
import { CommissionMigrationService } from '@/lib/commission/migration/CommissionMigrationService'

async function migrate() {
  console.log('🚀 Starting Commission System Migration (v1 → v2)')
  console.log('================================================\n')
  
  const service = new CommissionMigrationService()
  
  try {
    // Get all organizations
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            commissionTiers: true,
            commissionProfiles: true,
            users: {
              where: { role: 'TRAINER' }
            }
          }
        }
      }
    })
    
    console.log(`Found ${orgs.length} organization(s) to check:\n`)
    
    for (const org of orgs) {
      console.log(`📊 ${org.name}:`)
      console.log(`   - V1 Tiers: ${org._count.commissionTiers}`)
      console.log(`   - V2 Profiles: ${org._count.commissionProfiles}`)
      console.log(`   - Trainers: ${org._count.users}`)
      console.log('')
    }
    
    console.log('Starting migration...\n')
    
    // Run migration for all orgs
    const results = await service.migrateAll()
    
    // Summary
    console.log('\n================================================')
    console.log('📋 Migration Summary:')
    console.log('================================================')
    
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    console.log(`✅ Successful: ${successful.length}`)
    console.log(`❌ Failed: ${failed.length}`)
    console.log(`⏭️  Skipped: ${orgs.length - results.length}`)
    
    if (failed.length > 0) {
      console.log('\nFailed migrations:')
      failed.forEach(f => {
        console.log(`  - ${f.organizationName}: ${f.error}`)
      })
    }
    
    // Verify migrations
    console.log('\n================================================')
    console.log('🔍 Verification:')
    console.log('================================================')
    
    for (const result of successful) {
      const verification = await service.verifyMigration(result.organizationId)
      console.log(`\n${result.organizationName}:`)
      console.log(`  - Profile assigned: ${verification.profileAssigned ? '✅' : '❌'}`)
      if (verification.trainerId) {
        console.log(`  - Sample trainer: ${verification.trainerName}`)
        console.log(`  - Current month sessions: ${verification.sessionCount}`)
      }
    }
    
    console.log('\n✅ Migration complete!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  migrate()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}

export { migrate }