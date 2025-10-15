import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Adding varied session data with different package prices...')

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

  if (trainers.length === 0 || clients.length === 0) {
    console.log('❌ No existing data found. Please run the main seed first.')
    return
  }

  console.log(`Found ${trainers.length} trainers, ${clients.length} clients`)

  // First, create packages with varied prices for each trainer
  const packagePrices = [50, 75, 100, 125, 150, 200] // Different price points
  const packageTypes = [
    { name: 'Basic Training', sessions: 10, priceMultiplier: 0.5 },
    { name: 'Standard Training', sessions: 20, priceMultiplier: 1.0 },
    { name: 'Premium Training', sessions: 10, priceMultiplier: 1.5 },
    { name: 'Elite Performance', sessions: 8, priceMultiplier: 2.0 },
    { name: 'Group Session', sessions: 30, priceMultiplier: 0.3 },
    { name: 'Specialty Training', sessions: 5, priceMultiplier: 2.5 }
  ]

  // Create varied packages for different client-trainer combinations
  const packages = []
  let packageIndex = 0
  
  for (const trainer of trainers.slice(0, 4)) { // Focus on first 4 trainers
    for (const client of clients.slice(0, 5)) { // First 5 clients
      const packageType = packageTypes[packageIndex % packageTypes.length]
      const basePrice = packagePrices[Math.floor(Math.random() * packagePrices.length)]
      const sessionValue = Math.round(basePrice * packageType.priceMultiplier)
      
      try {
        const pkg = await prisma.package.create({
          data: {
            name: `${packageType.name} - ${trainer.name?.split(' ')[0]}-${client.name.split(' ')[0]}`,
            clientId: client.id,
            totalSessions: packageType.sessions,
            remainingSessions: packageType.sessions,
            sessionValue: sessionValue,
            totalValue: sessionValue * packageType.sessions,
            active: true
          }
        })
        packages.push(pkg)
        packageIndex++
      } catch (error) {
        // Package might already exist, continue
      }
    }
  }

  console.log(`✅ Created ${packages.length} packages with varied prices`)

  // Generate sessions using these varied packages
  const sessionsData = []
  const today = new Date()
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(today.getMonth() - 3)
  
  // Helper to generate random time between 9 AM and 7 PM
  const randomHour = () => Math.floor(Math.random() * 10) + 9
  
  // Helper to determine if session should be validated (85% chance)
  const shouldValidate = () => Math.random() < 0.85

  // Generate sessions for each package
  for (const pkg of packages) {
    const sessionsToCreate = Math.min(
      pkg.totalSessions, 
      Math.floor(Math.random() * pkg.totalSessions) + 1 // Random number of sessions used
    )
    
    for (let i = 0; i < sessionsToCreate; i++) {
      // Spread sessions randomly over the 3-month period
      const daysOffset = Math.floor(Math.random() * 90) // Random day in last 90 days
      const sessionDate = new Date(threeMonthsAgo)
      sessionDate.setDate(sessionDate.getDate() + daysOffset)
      sessionDate.setHours(randomHour(), Math.floor(Math.random() * 60), 0, 0)
      
      if (sessionDate <= today) {
        const isValidated = shouldValidate()
        // Get a trainer for this session
        const trainer = trainers[Math.floor(Math.random() * Math.min(4, trainers.length))]
        
        // Find the client to get their locationId
        const client = clients.find(c => c.id === pkg.clientId)
        sessionsData.push({
          trainerId: trainer.id,
          clientId: pkg.clientId,
          packageId: pkg.id,
          locationId: client?.locationId || locations[0].id,
          sessionDate,
          sessionValue: pkg.sessionValue, // Use the package's session value
          validated: isValidated,
          validatedAt: isValidated ? new Date(sessionDate.getTime() + (Math.random() * 6 + 1) * 60 * 60 * 1000) : null,
          validationToken: !isValidated ? `token_${Math.random().toString(36).substr(2, 9)}` : null,
          validationExpiry: !isValidated ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
        })
      }
    }
  }
  
  console.log(`📊 Generated ${sessionsData.length} sessions with varied prices`)
  
  // Insert all sessions
  let successCount = 0
  let errorCount = 0
  
  for (const session of sessionsData) {
    try {
      await prisma.session.create({ data: session })
      successCount++
    } catch (error) {
      errorCount++
      // Session might already exist, skip
    }
  }
  
  console.log(`✅ Successfully added ${successCount} new sessions`)
  if (errorCount > 0) {
    console.log(`⚠️  Skipped ${errorCount} sessions (may already exist)`)
  }
  
  // Show summary
  const totalSessions = await prisma.session.count()
  const validatedSessions = await prisma.session.count({ where: { validated: true } })
  
  console.log('\n📈 Session Summary:')
  console.log(`   Total sessions: ${totalSessions}`)
  console.log(`   Validated: ${validatedSessions}`)
  
  // Show sessions and average value per trainer
  console.log('\n💰 Trainer Performance (with varied package prices):')
  for (const trainer of trainers.slice(0, 4)) {
    const trainerSessions = await prisma.session.findMany({
      where: { trainerId: trainer.id },
      select: { sessionValue: true }
    })
    
    if (trainerSessions.length > 0) {
      const totalValue = trainerSessions.reduce((sum, s) => sum + (s.sessionValue || 0), 0)
      const avgValue = totalValue / trainerSessions.length
      const uniqueValues = [...new Set(trainerSessions.map(s => s.sessionValue))]
      
      console.log(`   ${trainer.name}:`)
      console.log(`      Sessions: ${trainerSessions.length}`)
      console.log(`      Total Value: $${totalValue}`)
      console.log(`      Average per session: $${avgValue.toFixed(2)}`)
      console.log(`      Package prices used: ${uniqueValues.sort((a, b) => (a || 0) - (b || 0)).map(v => `$${v}`).join(', ')}`)
    }
  }

  // Show overall package distribution
  const allPackages = await prisma.package.findMany({
    select: { sessionValue: true }
  })
  const priceDistribution = allPackages.reduce((acc, pkg) => {
    const price = pkg.sessionValue || 0
    acc[price] = (acc[price] || 0) + 1
    return acc
  }, {} as Record<number, number>)
  
  console.log('\n📦 Package Price Distribution:')
  Object.entries(priceDistribution)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([price, count]) => {
      console.log(`   $${price}: ${count} packages`)
    })
}

main()
  .catch((e) => {
    console.error('❌ Error adding sessions:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })