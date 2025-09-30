import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const locations = await prisma.location.findMany({
    orderBy: { name: 'asc' }
  })
  
  console.log('All locations in database:')
  locations.forEach(loc => {
    console.log(`- ${loc.name} (ID: ${loc.id})`)
  })
  
  // Check for duplicates by name
  const nameCount: { [key: string]: number } = {}
  locations.forEach(loc => {
    nameCount[loc.name] = (nameCount[loc.name] || 0) + 1
  })
  
  const duplicates = Object.entries(nameCount).filter(([_, count]) => count > 1)
  if (duplicates.length > 0) {
    console.log('\nDuplicates found:')
    duplicates.forEach(([name, count]) => {
      console.log(`- "${name}" appears ${count} times`)
    })
  } else {
    console.log('\nNo duplicate location names found')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())