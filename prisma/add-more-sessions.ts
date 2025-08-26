import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Adding more session data...')

  // Get existing data
  const trainers = await prisma.user.findMany({
    where: { role: 'TRAINER' },
    orderBy: { createdAt: 'asc' }
  })

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'asc' }
  })

  const packages = await prisma.package.findMany({
    orderBy: { createdAt: 'asc' }
  })

  const locations = await prisma.location.findMany({
    orderBy: { createdAt: 'asc' }
  })

  if (trainers.length === 0 || clients.length === 0 || packages.length === 0) {
    console.log('❌ No existing data found. Please run the main seed first.')
    return
  }

  console.log(`Found ${trainers.length} trainers, ${clients.length} clients, ${packages.length} packages`)

  // Generate sessions for the past 3 months
  const sessionsData = []
  const today = new Date()
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(today.getMonth() - 3)
  
  // Helper to generate random time between 9 AM and 7 PM
  const randomHour = () => Math.floor(Math.random() * 10) + 9
  
  // Helper to determine if session should be validated (90% chance)
  const shouldValidate = () => Math.random() < 0.9
  
  // Generate sessions for each trainer-client combination
  for (let weekOffset = 0; weekOffset < 12; weekOffset++) {
    const weekStart = new Date(threeMonthsAgo)
    weekStart.setDate(weekStart.getDate() + (weekOffset * 7))
    
    // First trainer with first client - 3 sessions per week
    if (trainers[0] && clients[0] && packages[0]) {
      for (let dayOffset of [1, 3, 5]) { // Mon, Wed, Fri
        const sessionDate = new Date(weekStart)
        sessionDate.setDate(sessionDate.getDate() + dayOffset)
        sessionDate.setHours(randomHour(), 0, 0, 0)
        
        if (sessionDate <= today) {
          const isValidated = shouldValidate()
          sessionsData.push({
            trainerId: trainers[0].id,
            clientId: clients[0].id,
            packageId: packages[0].id,
            locationId: trainers[0].locationId || locations[0].id,
            sessionDate,
            sessionValue: 100,
            validated: isValidated,
            validatedAt: isValidated ? new Date(sessionDate.getTime() + 4 * 60 * 60 * 1000) : null,
            validationToken: !isValidated ? `token_${Math.random().toString(36).substr(2, 9)}` : null,
            validationExpiry: !isValidated ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
          })
        }
      }
    }
    
    // Second trainer with second client - 2 sessions per week
    if (trainers[1] && clients[1] && packages[1]) {
      for (let dayOffset of [2, 4]) { // Tue, Thu
        const sessionDate = new Date(weekStart)
        sessionDate.setDate(sessionDate.getDate() + dayOffset)
        sessionDate.setHours(randomHour(), 0, 0, 0)
        
        if (sessionDate <= today) {
          const isValidated = shouldValidate()
          sessionsData.push({
            trainerId: trainers[1].id,
            clientId: clients[1].id,
            packageId: packages[1].id,
            locationId: trainers[1].locationId || locations[0].id,
            sessionDate,
            sessionValue: 100,
            validated: isValidated,
            validatedAt: isValidated ? new Date(sessionDate.getTime() + 3 * 60 * 60 * 1000) : null,
            validationToken: !isValidated ? `token_${Math.random().toString(36).substr(2, 9)}` : null,
            validationExpiry: !isValidated ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
          })
        }
      }
    }
    
    // Third trainer with third client - 2 sessions per week
    if (trainers[2] && clients[2] && packages[2]) {
      for (let dayOffset of [1, 4]) { // Mon, Thu
        const sessionDate = new Date(weekStart)
        sessionDate.setDate(sessionDate.getDate() + dayOffset)
        sessionDate.setHours(randomHour(), 0, 0, 0)
        
        if (sessionDate <= today) {
          const isValidated = shouldValidate()
          sessionsData.push({
            trainerId: trainers[2].id,
            clientId: clients[2].id,
            packageId: packages[2].id,
            locationId: trainers[2].locationId || locations[1].id,
            sessionDate,
            sessionValue: 100,
            validated: isValidated,
            validatedAt: isValidated ? new Date(sessionDate.getTime() + 5 * 60 * 60 * 1000) : null,
            validationToken: !isValidated ? `token_${Math.random().toString(36).substr(2, 9)}` : null,
            validationExpiry: !isValidated ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
          })
        }
      }
    }
    
    // Add some variety - different trainers with different clients
    // Trainer 0 with client 2
    if (trainers[0] && clients[2] && packages[0] && weekOffset % 3 === 0) {
      const sessionDate = new Date(weekStart)
      sessionDate.setDate(sessionDate.getDate() + 2) // Tuesday
      sessionDate.setHours(14, 0, 0, 0)
      
      if (sessionDate <= today) {
        const isValidated = shouldValidate()
        sessionsData.push({
          trainerId: trainers[0].id,
          clientId: clients[2].id,
          packageId: packages[0].id,
          locationId: trainers[0].locationId || locations[0].id,
          sessionDate,
          sessionValue: 100,
          validated: isValidated,
          validatedAt: isValidated ? new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000) : null,
          validationToken: !isValidated ? `token_${Math.random().toString(36).substr(2, 9)}` : null,
          validationExpiry: !isValidated ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
        })
      }
    }
    
    // Trainer 1 with client 0
    if (trainers[1] && clients[0] && packages[1] && weekOffset % 2 === 1) {
      for (let dayOffset of [0, 3]) { // Sun, Wed
        const sessionDate = new Date(weekStart)
        sessionDate.setDate(sessionDate.getDate() + dayOffset)
        sessionDate.setHours(randomHour(), 0, 0, 0)
        
        if (sessionDate <= today) {
          const isValidated = shouldValidate()
          sessionsData.push({
            trainerId: trainers[1].id,
            clientId: clients[0].id,
            packageId: packages[1].id,
            locationId: trainers[1].locationId || locations[0].id,
            sessionDate,
            sessionValue: 100,
            validated: isValidated,
            validatedAt: isValidated ? new Date(sessionDate.getTime() + 3 * 60 * 60 * 1000) : null,
            validationToken: !isValidated ? `token_${Math.random().toString(36).substr(2, 9)}` : null,
            validationExpiry: !isValidated ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
          })
        }
      }
    }
  }
  
  console.log(`📊 Generated ${sessionsData.length} sessions over the past 3 months`)
  
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
  const pendingSessions = await prisma.session.count({ where: { validated: false } })
  
  console.log('\n📈 Session Summary:')
  console.log(`   Total sessions: ${totalSessions}`)
  console.log(`   Validated: ${validatedSessions}`)
  console.log(`   Pending validation: ${pendingSessions}`)
  
  // Show sessions per trainer
  console.log('\n👥 Sessions per Trainer:')
  for (const trainer of trainers) {
    const count = await prisma.session.count({ where: { trainerId: trainer.id } })
    console.log(`   ${trainer.name}: ${count} sessions`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Error adding sessions:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })