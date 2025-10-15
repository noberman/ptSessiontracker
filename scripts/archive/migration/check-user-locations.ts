import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check if any user_locations were created from the migration
  const userLocations = await prisma.userLocation.findMany({
    include: {
      user: true,
      location: true
    }
  })
  
  console.log(`Total UserLocation records: ${userLocations.length}`)
  
  if (userLocations.length > 0) {
    console.log('\nUserLocation records:')
    userLocations.forEach(ul => {
      console.log(`- ${ul.user.name} (${ul.user.role}) -> ${ul.location.name}`)
    })
  }
  
  // Check users with locationId
  const usersWithLocation = await prisma.user.findMany({
    where: {
      locationId: { not: null },
      role: { not: 'ADMIN' }
    },
    include: {
      location: true
    }
  })
  
  console.log(`\nUsers with locationId (non-ADMIN): ${usersWithLocation.length}`)
  usersWithLocation.forEach(u => {
    console.log(`- ${u.name} (${u.role}) -> ${u.location?.name}`)
  })
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })