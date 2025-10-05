import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function auditLocationData() {
  console.log('=== LOCATION DATA AUDIT ===\n')
  
  const stats = {
    totalUsers: 0,
    usersWithOldLocation: 0,
    usersWithNewLocation: 0,
    usersWithBoth: 0,
    usersWithNeither: 0,
    conflicts: [] as any[],
    missingMigrations: [] as any[]
  }
  
  // Get all users with their location data
  const users = await prisma.user.findMany({
    include: { 
      locations: true,
      location: true 
    }
  })
  
  console.log(`Total users in database: ${users.length}\n`)
  
  for (const user of users) {
    stats.totalUsers++
    const hasOld = user.locationId !== null
    const hasNew = user.locations.length > 0
    
    if (hasOld && hasNew) {
      stats.usersWithBoth++
      // Check for conflicts - old location not in new locations
      const newLocationIds = user.locations.map(l => l.locationId)
      if (!newLocationIds.includes(user.locationId!)) {
        stats.conflicts.push({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          oldLocation: user.location?.name,
          oldLocationId: user.locationId,
          newLocationIds: newLocationIds,
          newLocationNames: user.locations.map(l => l.locationId)
        })
      }
    } else if (hasOld && !hasNew) {
      stats.usersWithOldLocation++
      // These users need migration
      stats.missingMigrations.push({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        locationId: user.locationId,
        locationName: user.location?.name,
        role: user.role
      })
    } else if (!hasOld && hasNew) {
      stats.usersWithNewLocation++
    } else {
      stats.usersWithNeither++
    }
  }
  
  // Display results
  console.log('=== USER LOCATION STATISTICS ===')
  console.log(`Total Users: ${stats.totalUsers}`)
  console.log(`Users with ONLY old locationId: ${stats.usersWithOldLocation}`)
  console.log(`Users with ONLY new UserLocation: ${stats.usersWithNewLocation}`)
  console.log(`Users with BOTH systems: ${stats.usersWithBoth}`)
  console.log(`Users with NEITHER (no location): ${stats.usersWithNeither}`)
  
  if (stats.conflicts.length > 0) {
    console.log('\n=== CONFLICTS (Old location not in new locations) ===')
    for (const conflict of stats.conflicts) {
      console.log(`User: ${conflict.userName} (${conflict.userEmail})`)
      console.log(`  Old Location: ${conflict.oldLocation} (${conflict.oldLocationId})`)
      console.log(`  New Locations: ${conflict.newLocationIds.join(', ')}`)
    }
  }
  
  if (stats.missingMigrations.length > 0) {
    console.log('\n=== USERS NEEDING MIGRATION (have old locationId but no UserLocation records) ===')
    for (const user of stats.missingMigrations) {
      console.log(`${user.userName} (${user.userEmail}) - Role: ${user.role} - Location: ${user.locationName}`)
    }
  }
  
  // Check for orphaned UserLocation records
  console.log('\n=== CHECKING FOR ORPHANED DATA ===')
  const allUserLocations = await prisma.userLocation.findMany({
    include: {
      user: true,
      location: true
    }
  })
  const orphanedUserLocations = allUserLocations.filter(ul => !ul.user || !ul.location)
  console.log(`Orphaned UserLocation records: ${orphanedUserLocations.length}`)
  
  // Check clients and sessions referencing locations
  console.log('\n=== CLIENT & SESSION LOCATION REFERENCES ===')
  const clientsWithLocation = await prisma.client.count()
  const sessionsWithLocation = await prisma.session.count()
  console.log(`Clients with locationId: ${clientsWithLocation}`)
  console.log(`Sessions with locationId: ${sessionsWithLocation}`)
  
  // Summary
  console.log('\n=== MIGRATION READINESS ===')
  if (stats.missingMigrations.length === 0 && stats.conflicts.length === 0) {
    console.log('✅ All users have been migrated to UserLocation table')
    console.log('✅ No conflicts found')
    console.log('Ready to remove old locationId system!')
  } else {
    console.log(`⚠️  ${stats.missingMigrations.length} users need migration to UserLocation table`)
    console.log(`⚠️  ${stats.conflicts.length} users have conflicts between old and new systems`)
    console.log('Migration needed before removing old locationId system')
  }
  
  return stats
}

auditLocationData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())