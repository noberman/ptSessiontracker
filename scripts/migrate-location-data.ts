import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateLocationData() {
  console.log('=== STARTING LOCATION DATA MIGRATION ===\n')
  
  try {
    // Run in a transaction for safety
    const result = await prisma.$transaction(async (tx) => {
      // Get users who need migration (have locationId but no UserLocation records)
      const usersToMigrate = await tx.user.findMany({
        where: {
          locationId: { not: null },
          locations: { none: {} }
        },
        include: {
          location: true
        }
      })
      
      console.log(`Found ${usersToMigrate.length} users to migrate`)
      
      if (usersToMigrate.length === 0) {
        console.log('No users need migration!')
        return { count: 0, users: [] }
      }
      
      // Display users to be migrated
      console.log('\nUsers to migrate:')
      for (const user of usersToMigrate) {
        console.log(`- ${user.name} (${user.email}) - ${user.role} - Location: ${user.location?.name}`)
      }
      
      // Prepare UserLocation records
      const userLocationData = usersToMigrate.map(user => ({
        userId: user.id,
        locationId: user.locationId!
      }))
      
      // Create UserLocation records
      console.log(`\nCreating ${userLocationData.length} UserLocation records...`)
      const createResult = await tx.userLocation.createMany({
        data: userLocationData,
        skipDuplicates: true // Safety: skip if already exists
      })
      
      console.log(`✅ Created ${createResult.count} UserLocation records`)
      
      // Return migrated users for verification
      const migratedUsers = await tx.user.findMany({
        where: {
          id: { in: usersToMigrate.map(u => u.id) }
        },
        include: {
          locations: {
            include: {
              location: true
            }
          }
        }
      })
      
      return { count: createResult.count, users: migratedUsers }
    })
    
    // Verify migration
    console.log('\n=== VERIFICATION ===')
    for (const user of result.users) {
      const locationNames = user.locations.map(l => l.location.name).join(', ')
      console.log(`✅ ${user.name}: ${locationNames}`)
    }
    
    // Run final audit
    console.log('\n=== POST-MIGRATION AUDIT ===')
    const remainingOldOnly = await prisma.user.count({
      where: {
        locationId: { not: null },
        locations: { none: {} }
      }
    })
    
    if (remainingOldOnly === 0) {
      console.log('✅ All users successfully migrated to UserLocation table!')
      console.log('✅ Ready to proceed with code cleanup')
    } else {
      console.log(`⚠️  ${remainingOldOnly} users still need migration`)
    }
    
    return result
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run migration
migrateLocationData()
  .then(result => {
    console.log('\n=== MIGRATION COMPLETE ===')
    console.log(`Successfully migrated ${result.count} users`)
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect())