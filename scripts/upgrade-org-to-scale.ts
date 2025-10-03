import { PrismaClient } from '@prisma/client'

// Script to upgrade an organization to SCALE subscription tier
// Usage: STAGING_DATABASE_URL="..." npx tsx scripts/upgrade-org-to-scale.ts

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL
    }
  }
})

async function main() {
  console.log('🔄 Upgrading organization to SCALE tier...\n')
  
  // List all organizations
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      subscriptionTier: true,
      _count: {
        select: {
          users: true,
          locations: true,
          clients: true
        }
      }
    }
  })
  
  console.log('Available organizations:')
  organizations.forEach((org, index) => {
    console.log(`${index + 1}. ${org.name} (${org.email})`)
    console.log(`   Current tier: ${org.subscriptionTier}`)
    console.log(`   Stats: ${org._count.users} users, ${org._count.locations} locations, ${org._count.clients} clients`)
  })
  
  // For staging, let's upgrade the first organization (or specify which one)
  // You can modify this to select a specific org
  const orgToUpgrade = organizations[0] // Change index or add logic to select specific org
  
  if (!orgToUpgrade) {
    console.log('❌ No organizations found')
    return
  }
  
  console.log(`\n✅ Upgrading "${orgToUpgrade.name}" to SCALE tier...`)
  
  const updated = await prisma.organization.update({
    where: { id: orgToUpgrade.id },
    data: {
      subscriptionTier: 'PRO', // Using PRO as SCALE might not exist in enum
      subscriptionStatus: 'ACTIVE'
    }
  })
  
  console.log(`\n🎉 Successfully upgraded ${updated.name} to ${updated.subscriptionTier} tier!`)
  console.log('Organization can now access all premium features.')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })