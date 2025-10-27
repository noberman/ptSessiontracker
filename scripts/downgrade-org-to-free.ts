import { PrismaClient } from '@prisma/client'

// Script to downgrade an organization to FREE (Starter) subscription tier
// Usage: DATABASE_URL="..." npx tsx scripts/downgrade-org-to-free.ts

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function main() {
  console.log('🔄 Downgrading organization to FREE (Starter) tier...\n')
  
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
  
  // Find Snap Fitness Singapore
  const snapFitness = organizations.find(org => 
    org.name.toLowerCase().includes('snap fitness') || 
    org.email.includes('snapfitness')
  )
  
  if (!snapFitness) {
    console.log('❌ Snap Fitness Singapore not found')
    console.log('Available orgs:', organizations.map(o => o.name))
    return
  }
  
  console.log(`\n✅ Downgrading "${snapFitness.name}" to FREE tier...`)
  console.log(`   Current stats: ${snapFitness._count.users} users, ${snapFitness._count.locations} locations`)
  console.log(`   FREE tier limits: 2 trainers, 1 location, 50 sessions/month`)
  
  if (snapFitness._count.users > 2) {
    console.log(`   ⚠️  WARNING: Organization has ${snapFitness._count.users} users but FREE allows only 2!`)
  }
  if (snapFitness._count.locations > 1) {
    console.log(`   ⚠️  WARNING: Organization has ${snapFitness._count.locations} locations but FREE allows only 1!`)
  }
  
  const updated = await prisma.organization.update({
    where: { id: snapFitness.id },
    data: {
      subscriptionTier: 'FREE',
      subscriptionStatus: 'ACTIVE',
      // Set a lastIssue to trigger the warning banner
      lastIssue: snapFitness._count.users > 2 
        ? `⚠️ You have ${snapFitness._count.users} trainers but your FREE plan allows 2. Please deactivate ${snapFitness._count.users - 2} trainer(s) to comply with your plan limits.`
        : null,
      lastIssueDate: snapFitness._count.users > 2 ? new Date() : null
    }
  })
  
  console.log(`\n🎉 Successfully downgraded ${updated.name} to ${updated.subscriptionTier} tier!`)
  console.log('This will trigger limit warnings if they exceed FREE tier limits.')
  
  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: 'SUBSCRIPTION_DOWNGRADE_MANUAL',
      userId: null, // System action
      entityType: 'Organization',
      entityId: updated.id,
      oldValue: { tier: snapFitness.subscriptionTier },
      newValue: { 
        tier: 'FREE',
        message: 'Manual downgrade for testing limit warnings'
      }
    }
  })
  
  console.log('\n📝 Audit log created for the downgrade')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })