import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function rollbackOrganization() {
  console.log('⚠️  WARNING: This will remove all organization associations!')
  console.log('This script is for emergency rollback only.')
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...')
  
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  try {
    console.log('🔄 Starting rollback...')
    
    // Set all organizationId fields to null
    const usersResult = await prisma.user.updateMany({
      where: { organizationId: { not: null } },
      data: { organizationId: null }
    })
    console.log(`✅ Cleared organizationId from ${usersResult.count} users`)
    
    const locationsResult = await prisma.location.updateMany({
      where: { organizationId: { not: null } },
      data: { organizationId: null }
    })
    console.log(`✅ Cleared organizationId from ${locationsResult.count} locations`)
    
    const tiersResult = await prisma.commissionTier.updateMany({
      where: { organizationId: { not: null } },
      data: { organizationId: null }
    })
    console.log(`✅ Cleared organizationId from ${tiersResult.count} commission tiers`)
    
    // Note: PackageTypes require organizationId, so we can't set them to null
    // They would need to be deleted if a full rollback is needed
    console.log(`⚠️  PackageTypes require organizationId and cannot be set to null`)
    
    console.log('\n⚠️  Rollback completed. organizationId fields have been set to null.')
    console.log('Note: Organization records themselves were NOT deleted.')
    
  } catch (error) {
    console.error('❌ Rollback failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Only run if explicitly confirmed
if (process.argv[2] === '--confirm') {
  rollbackOrganization()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
} else {
  console.log('⚠️  Rollback script - removes all organization associations')
  console.log('To run: npm run rollback:organization -- --confirm')
  process.exit(0)
}