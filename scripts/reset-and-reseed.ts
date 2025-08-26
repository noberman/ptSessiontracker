import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Cleaning up existing sessions and packages...')
  
  // Delete all sessions first (due to foreign key constraints)
  await prisma.session.deleteMany({})
  console.log('✅ Deleted all sessions')
  
  // Delete all packages
  await prisma.package.deleteMany({})
  console.log('✅ Deleted all packages')
  
  // Get existing data
  const trainers = await prisma.user.findMany({
    where: { role: 'TRAINER' },
    orderBy: { createdAt: 'asc' }
  })

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'asc' }
  })

  const locations = await prisma.location.findMany({
    orderBy: { createdAt: 'asc' }
  })

  console.log(`\n📦 Creating packages with varied prices...`)

  // Package templates with different price points
  const packageTemplates = [
    { name: 'Basic Group Training', sessionValue: 30, totalSessions: 20 },
    { name: 'Standard Training', sessionValue: 75, totalSessions: 10 },
    { name: 'Advanced Training', sessionValue: 100, totalSessions: 10 },
    { name: 'Premium 1-on-1', sessionValue: 150, totalSessions: 8 },
    { name: 'Elite Performance', sessionValue: 200, totalSessions: 5 },
    { name: 'Specialty Coaching', sessionValue: 250, totalSessions: 4 },
  ]

  const packages = []
  
  // Create multiple packages per trainer with different prices
  for (let t = 0; t < Math.min(trainers.length, 4); t++) {
    const trainer = trainers[t]
    
    // Each trainer gets 3-4 different package types
    const numPackageTypes = 3 + Math.floor(Math.random() * 2)
    
    for (let p = 0; p < numPackageTypes; p++) {
      const template = packageTemplates[p % packageTemplates.length]
      
      // Create this package type for 2-3 different clients
      const numClients = 2 + Math.floor(Math.random() * 2)
      
      for (let c = 0; c < Math.min(numClients, clients.length); c++) {
        const client = clients[(t + c * 2) % clients.length] // Distribute clients across trainers
        
        const pkg = await prisma.package.create({
          data: {
            name: `${template.name}`,
            clientId: client.id,
            totalSessions: template.totalSessions,
            remainingSessions: Math.floor(Math.random() * template.totalSessions), // Some partially used
            sessionValue: template.sessionValue,
            totalValue: template.sessionValue * template.totalSessions,
            active: true
          }
        })
        packages.push(pkg)
      }
    }
  }

  console.log(`✅ Created ${packages.length} packages with prices ranging from $30 to $250`)

  // Generate sessions over the past 3 months
  console.log(`\n📊 Generating sessions...`)
  
  const sessionsData = []
  const today = new Date()
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(today.getMonth() - 3)
  
  for (const pkg of packages) {
    // Each package gets 40-90% of its sessions used
    const sessionPercentage = 0.4 + Math.random() * 0.5
    const sessionsToCreate = Math.floor(pkg.totalSessions * sessionPercentage)
    
    for (let s = 0; s < sessionsToCreate; s++) {
      // Spread sessions throughout the 3 months
      const daysAgo = Math.floor(Math.random() * 90)
      const sessionDate = new Date(today)
      sessionDate.setDate(sessionDate.getDate() - daysAgo)
      sessionDate.setHours(9 + Math.floor(Math.random() * 10), 0, 0, 0)
      
      // 85% validation rate
      const isValidated = Math.random() < 0.85
      
      // Assign a random trainer for this session (simulating different trainers working with same client)
      const randomTrainer = trainers[Math.floor(Math.random() * Math.min(4, trainers.length))]
      
      sessionsData.push({
        trainerId: randomTrainer.id,
        clientId: pkg.clientId,
        packageId: pkg.id,
        locationId: randomTrainer.locationId || locations[0].id,
        sessionDate,
        sessionValue: pkg.sessionValue, // Uses the package's value
        validated: isValidated,
        validatedAt: isValidated ? new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000) : null,
        validationToken: !isValidated ? `token_${Math.random().toString(36).substr(2, 9)}` : null,
        validationExpiry: !isValidated ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
      })
    }
  }

  // Bulk create sessions
  await prisma.session.createMany({
    data: sessionsData
  })

  console.log(`✅ Created ${sessionsData.length} sessions`)

  // Show detailed summary
  console.log('\n📈 Final Summary:')
  
  for (const trainer of trainers.slice(0, 4)) {
    const trainerSessions = await prisma.session.findMany({
      where: { trainerId: trainer.id },
      include: { package: true }
    })
    
    if (trainerSessions.length > 0) {
      const totalValue = trainerSessions.reduce((sum, s) => sum + (s.sessionValue || 0), 0)
      const avgValue = totalValue / trainerSessions.length
      const uniquePrices = [...new Set(trainerSessions.map(s => s.sessionValue))].sort((a, b) => (a || 0) - (b || 0))
      
      console.log(`\n${trainer.name}:`)
      console.log(`  📊 Total Sessions: ${trainerSessions.length}`)
      console.log(`  💰 Total Revenue: $${totalValue.toLocaleString()}`)
      console.log(`  📈 Average per Session: $${avgValue.toFixed(2)}`)
      console.log(`  📦 Package Prices: ${uniquePrices.map(p => `$${p}`).join(', ')}`)
      
      // Show package breakdown
      const packageBreakdown = trainerSessions.reduce((acc, session) => {
        const key = `$${session.sessionValue} (${session.package?.name})`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      console.log(`  📋 Sessions by Package:`)
      Object.entries(packageBreakdown).forEach(([pkg, count]) => {
        console.log(`     - ${pkg}: ${count} sessions`)
      })
    }
  }
  
  const totalSessions = await prisma.session.count()
  const totalValue = await prisma.session.aggregate({
    _sum: { sessionValue: true }
  })
  
  console.log(`\n🎯 Overall Totals:`)
  console.log(`  Total Sessions: ${totalSessions}`)
  console.log(`  Total Revenue: $${totalValue._sum.sessionValue?.toLocaleString() || 0}`)
  console.log(`  Average Session Value: $${((totalValue._sum.sessionValue || 0) / totalSessions).toFixed(2)}`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })