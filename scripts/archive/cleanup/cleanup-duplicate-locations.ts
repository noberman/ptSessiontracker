import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Finding duplicate locations...')
  
  const locations = await prisma.location.findMany({
    include: {
      userLocations: {
        include: {
          user: true
        }
      },
      clients: true,
      sessions: true
    },
    orderBy: { createdAt: 'asc' }
  })
  
  // Group locations by name
  const locationsByName: { [key: string]: typeof locations } = {}
  locations.forEach(loc => {
    if (!locationsByName[loc.name]) {
      locationsByName[loc.name] = []
    }
    locationsByName[loc.name].push(loc)
  })
  
  // Find duplicates
  const duplicateGroups = Object.entries(locationsByName).filter(([_, locs]) => locs.length > 1)
  
  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicate locations found')
    return
  }
  
  console.log(`Found ${duplicateGroups.length} groups of duplicate locations`)
  
  for (const [name, duplicates] of duplicateGroups) {
    console.log(`\n📍 Processing "${name}" (${duplicates.length} duplicates)`)
    
    // Keep the first (oldest) location and merge others into it
    const [keepLocation, ...toMerge] = duplicates
    
    console.log(`  Keeping: ${keepLocation.id} (created: ${keepLocation.createdAt})`)
    console.log(`  Has: ${keepLocation.userLocations.length} users, ${keepLocation.clients.length} clients, ${keepLocation.sessions.length} sessions`)
    
    for (const mergeLocation of toMerge) {
      console.log(`  Merging: ${mergeLocation.id} (created: ${mergeLocation.createdAt})`)
      console.log(`    Has: ${mergeLocation.userLocations.length} users, ${mergeLocation.clients.length} clients, ${mergeLocation.sessions.length} sessions`)
      
      // Update all references to point to the kept location
      await prisma.$transaction([
        // Update users
        prisma.user.updateMany({
          where: { locationId: mergeLocation.id },
          data: { locationId: keepLocation.id }
        }),
        // Update clients
        prisma.client.updateMany({
          where: { locationId: mergeLocation.id },
          data: { locationId: keepLocation.id }
        }),
        // Update sessions
        prisma.session.updateMany({
          where: { locationId: mergeLocation.id },
          data: { locationId: keepLocation.id }
        }),
        // Delete the duplicate location
        prisma.location.delete({
          where: { id: mergeLocation.id }
        })
      ])
      
      console.log(`    ✅ Merged and deleted`)
    }
  }
  
  console.log('\n🎉 Cleanup complete!')
  
  // Verify
  const finalLocations = await prisma.location.findMany({
    orderBy: { name: 'asc' }
  })
  console.log('\nFinal locations:')
  finalLocations.forEach(loc => {
    console.log(`- ${loc.name} (ID: ${loc.id})`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())