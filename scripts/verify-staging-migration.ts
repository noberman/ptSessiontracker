import { PrismaClient } from '@prisma/client'

// Connect to staging database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:zVYayjKtiuqGOvsaVrDqkODNUSVGSfuD@turntable.proxy.rlwy.net:24999/railway"
    }
  }
})

async function main() {
  console.log('Verifying staging migration...\n')
  
  // Check if user_locations table was created and populated
  const userLocationCount = await prisma.userLocation.count()
  console.log(`✓ UserLocation table created with ${userLocationCount} records`)
  
  // Get users with locationId to verify data migration
  const usersWithLocation = await prisma.user.findMany({
    where: {
      locationId: { not: null },
      role: { not: 'ADMIN' }
    },
    select: {
      id: true,
      name: true,
      role: true,
      locationId: true
    }
  })
  
  console.log(`\nFound ${usersWithLocation.length} users with locationId (non-ADMIN)`)
  
  // Check if each user has a corresponding junction table entry
  let missingCount = 0
  for (const user of usersWithLocation) {
    const hasJunctionEntry = await prisma.userLocation.findFirst({
      where: {
        userId: user.id,
        locationId: user.locationId!
      }
    })
    
    if (!hasJunctionEntry) {
      console.log(`❌ Missing junction entry for ${user.name} (${user.role})`)
      missingCount++
    }
  }
  
  if (missingCount === 0) {
    console.log('✓ All users with locationId have corresponding junction entries')
  } else {
    console.log(`\n⚠️  ${missingCount} users missing junction entries`)
  }
  
  // Show sample of UserLocation data
  const sampleUserLocations = await prisma.userLocation.findMany({
    take: 5,
    include: {
      user: {
        select: { name: true, role: true }
      },
      location: {
        select: { name: true }
      }
    }
  })
  
  console.log('\nSample UserLocation records:')
  sampleUserLocations.forEach(ul => {
    console.log(`- ${ul.user.name} (${ul.user.role}) → ${ul.location.name}`)
  })
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })