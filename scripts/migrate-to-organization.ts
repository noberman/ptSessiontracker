import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateToOrganization() {
  try {
    console.log('🚀 Starting migration to Snap Fitness Singapore organization...')
    
    // 1. Find or create Snap Fitness Singapore organization
    const snapFitness = await prisma.organization.upsert({
      where: { 
        email: 'admin@snapfitness.sg' 
      },
      update: {}, // Don't update if exists
      create: {
        name: 'Snap Fitness Singapore',
        email: 'admin@snapfitness.sg',
        phone: '+65 6789 0123',
        subscriptionTier: SubscriptionTier.PRO,
        subscriptionStatus: SubscriptionStatus.ACTIVE
      }
    })
    
    console.log(`✅ Organization found/created: ${snapFitness.name} (ID: ${snapFitness.id})`)
    
    // 2. Update all users with null organizationId
    const usersResult = await prisma.user.updateMany({
      where: { organizationId: null },
      data: { organizationId: snapFitness.id }
    })
    console.log(`✅ Updated ${usersResult.count} users`)
    
    // 3. Update all locations with null organizationId
    const locationsResult = await prisma.location.updateMany({
      where: { organizationId: null },
      data: { organizationId: snapFitness.id }
    })
    console.log(`✅ Updated ${locationsResult.count} locations`)
    
    // 4. Update all commission tiers with null organizationId
    const tiersResult = await prisma.commissionTier.updateMany({
      where: { organizationId: null },
      data: { organizationId: snapFitness.id }
    })
    console.log(`✅ Updated ${tiersResult.count} commission tiers`)
    
    // 5. Update all package templates with null organizationId
    const templatesResult = await prisma.packageTemplate.updateMany({
      where: { organizationId: null },
      data: { organizationId: snapFitness.id }
    })
    console.log(`✅ Updated ${templatesResult.count} package templates`)
    
    // 6. Verify no orphaned data remains
    console.log('\n📊 Verification:')
    
    const orphanedUsers = await prisma.user.count({
      where: { organizationId: null }
    })
    const orphanedLocations = await prisma.location.count({
      where: { organizationId: null }
    })
    const orphanedTiers = await prisma.commissionTier.count({
      where: { organizationId: null }
    })
    const orphanedTemplates = await prisma.packageTemplate.count({
      where: { organizationId: null }
    })
    
    console.log(`  Users without organization: ${orphanedUsers}`)
    console.log(`  Locations without organization: ${orphanedLocations}`)
    console.log(`  Commission tiers without organization: ${orphanedTiers}`)
    console.log(`  Package templates without organization: ${orphanedTemplates}`)
    
    if (orphanedUsers + orphanedLocations + orphanedTiers + orphanedTemplates === 0) {
      console.log('\n✅ Migration completed successfully! All data is now linked to Snap Fitness Singapore.')
    } else {
      console.log('\n⚠️  Some records still have null organizationId. Please investigate.')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateToOrganization()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })