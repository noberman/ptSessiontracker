import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Testing data migration logic...\n')
  
  // Get all users with locationId (excluding ADMIN)
  const usersToMigrate = await prisma.user.findMany({
    where: {
      locationId: { not: null },
      role: { not: 'ADMIN' }
    },
    include: {
      location: true
    }
  })
  
  console.log(`Found ${usersToMigrate.length} users to migrate:`)
  
  // Create UserLocation records for each
  for (const user of usersToMigrate) {
    console.log(`- Creating UserLocation for ${user.name} (${user.role}) -> ${user.location?.name}`)
    
    try {
      await prisma.userLocation.create({
        data: {
          userId: user.id,
          locationId: user.locationId!
        }
      })
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`  (Already exists)`)
      } else {
        throw error
      }
    }
  }
  
  // Verify the results
  const totalUserLocations = await prisma.userLocation.count()
  console.log(`\nTotal UserLocation records after migration: ${totalUserLocations}`)
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })