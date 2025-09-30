import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get current tiers
  const currentTiers = await prisma.commissionTier.findMany()
  
  console.log('Current tiers:', currentTiers)
  
  // Update tiers if they're in decimal format
  for (const tier of currentTiers) {
    if (tier.percentage < 1) {
      // Convert from decimal to percentage (0.25 -> 25)
      const newPercentage = tier.percentage * 100
      
      await prisma.commissionTier.update({
        where: { id: tier.id },
        data: { percentage: newPercentage }
      })
      
      console.log(`Updated tier ${tier.id}: ${tier.percentage} -> ${newPercentage}`)
    }
  }
  
  // Verify the update
  const updatedTiers = await prisma.commissionTier.findMany({
    orderBy: { minSessions: 'asc' }
  })
  
  console.log('Updated tiers:', updatedTiers)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())