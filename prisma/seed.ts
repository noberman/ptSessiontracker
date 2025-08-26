import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create locations
  const woodSquare = await prisma.location.create({
    data: {
      name: 'Wood Square',
      address: '123 Wood Square Ave'
    }
  })

  const plaza888 = await prisma.location.create({
    data: {
      name: '888 Plaza',
      address: '888 Plaza Street'
    }
  })

  const woodlandsHealth = await prisma.location.create({
    data: {
      name: 'Woodlands Health',
      address: '456 Woodlands Road'
    }
  })

  console.log('✅ Created 3 locations')

  // Create admin user
  const adminPassword = await hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ptsession.com',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
      active: true
    }
  })

  console.log('✅ Created admin user')

  // Create managers
  const managerPassword = await hash('manager123', 10)
  
  const clubManager = await prisma.user.create({
    data: {
      email: 'manager@woodsquare.com',
      password: managerPassword,
      name: 'Sarah Manager',
      role: Role.CLUB_MANAGER,
      locationId: woodSquare.id,
      active: true
    }
  })

  const ptManager = await prisma.user.create({
    data: {
      email: 'ptmanager@ptsession.com',
      password: managerPassword,
      name: 'Mike PT Manager',
      role: Role.PT_MANAGER,
      active: true
    }
  })

  console.log('✅ Created managers')

  // Create trainers (2 per location)
  const trainerPassword = await hash('trainer123', 10)
  
  const trainersData = [
    // Wood Square trainers
    { name: 'John Smith', email: 'john@woodsquare.com', locationId: woodSquare.id },
    { name: 'Emma Wilson', email: 'emma@woodsquare.com', locationId: woodSquare.id },
    // 888 Plaza trainers
    { name: 'David Chen', email: 'david@888plaza.com', locationId: plaza888.id },
    { name: 'Lisa Johnson', email: 'lisa@888plaza.com', locationId: plaza888.id },
    // Woodlands Health trainers
    { name: 'Robert Brown', email: 'robert@woodlands.com', locationId: woodlandsHealth.id },
    { name: 'Maria Garcia', email: 'maria@woodlands.com', locationId: woodlandsHealth.id }
  ]

  const trainers = await Promise.all(
    trainersData.map(trainer =>
      prisma.user.create({
        data: {
          ...trainer,
          password: trainerPassword,
          role: Role.TRAINER,
          active: true
        }
      })
    )
  )

  console.log('✅ Created 6 trainers')

  // Create clients (1 per trainer)
  const clientsData = [
    { name: 'Alice Cooper', email: 'alice@example.com', locationId: woodSquare.id, primaryTrainerId: trainers[0].id },
    { name: 'Bob Martin', email: 'bob@example.com', locationId: woodSquare.id, primaryTrainerId: trainers[1].id },
    { name: 'Charlie Davis', email: 'charlie@example.com', locationId: plaza888.id, primaryTrainerId: trainers[2].id },
    { name: 'Diana Prince', email: 'diana@example.com', locationId: plaza888.id, primaryTrainerId: trainers[3].id },
    { name: 'Edward Norton', email: 'edward@example.com', locationId: woodlandsHealth.id, primaryTrainerId: trainers[4].id },
    { name: 'Fiona Apple', email: 'fiona@example.com', locationId: woodlandsHealth.id, primaryTrainerId: trainers[5].id }
  ]

  const clients = await Promise.all(
    clientsData.map(client =>
      prisma.client.create({
        data: {
          ...client,
          phone: '555-0100',
          active: true
        }
      })
    )
  )

  console.log('✅ Created 6 clients')

  // Create packages for some clients (12 session package at $1200)
  const packagesData = [
    { clientId: clients[0].id, name: '12 Session Package', totalValue: 1200, totalSessions: 12 },
    { clientId: clients[1].id, name: '12 Session Package', totalValue: 1200, totalSessions: 12 },
    { clientId: clients[2].id, name: '12 Session Package', totalValue: 1200, totalSessions: 12 },
    { clientId: clients[3].id, name: '12 Session Package', totalValue: 1200, totalSessions: 12 }
  ]

  const packages = await Promise.all(
    packagesData.map(pkg =>
      prisma.package.create({
        data: {
          ...pkg,
          sessionValue: pkg.totalValue / pkg.totalSessions, // $100 per session
          active: true
        }
      })
    )
  )

  console.log('✅ Created 4 packages')

  // Create sample sessions (2 per client with package)
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
    
    // John Smith (trainer 0) with client 0 - 3 sessions per week
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
          locationId: woodSquare.id,
          sessionDate,
          sessionValue: 100,
          validatedAt: isValidated ? new Date(sessionDate.getTime() + 4 * 60 * 60 * 1000) : null
        })
      }
    }
    
    // Jane Doe (trainer 1) with client 1 - 2 sessions per week
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
          locationId: woodSquare.id,
          sessionDate,
          sessionValue: 100,
          validatedAt: isValidated ? new Date(sessionDate.getTime() + 3 * 60 * 60 * 1000) : null
        })
      }
    }
    
    // Mike Johnson (trainer 2) with client 2 - 2 sessions per week
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
          locationId: plaza888.id,
          sessionDate,
          sessionValue: 100,
          validatedAt: isValidated ? new Date(sessionDate.getTime() + 5 * 60 * 60 * 1000) : null
        })
      }
    }
    
    // Add some sessions for other trainers with varying patterns
    // Sarah Wilson (trainer 3) with client 3
    if (weekOffset % 2 === 0) { // Every other week
      for (let dayOffset of [0, 2, 4]) { // Sun, Tue, Thu
        const sessionDate = new Date(weekStart)
        sessionDate.setDate(sessionDate.getDate() + dayOffset)
        sessionDate.setHours(randomHour(), 0, 0, 0)
        
        if (sessionDate <= today && clients[3] && trainers[3]) {
          const isValidated = shouldValidate()
          sessionsData.push({
            trainerId: trainers[3].id,
            clientId: clients[3].id,
            packageId: packages[3]?.id || packages[0].id,
            locationId: plaza888.id,
            sessionDate,
            sessionValue: 100,
            validatedAt: isValidated ? new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000) : null
          })
        }
      }
    }
    
    // Tom Chen (trainer 4) with multiple clients
    if (trainers[4]) {
      // With client 0 - 1 session per week
      const sessionDate1 = new Date(weekStart)
      sessionDate1.setDate(sessionDate1.getDate() + 3) // Wednesday
      sessionDate1.setHours(15, 0, 0, 0)
      
      if (sessionDate1 <= today) {
        const isValidated = shouldValidate()
        sessionsData.push({
          trainerId: trainers[4].id,
          clientId: clients[0].id,
          packageId: packages[0].id,
          locationId: uptownFitness.id,
          sessionDate: sessionDate1,
          sessionValue: 100,
          validatedAt: isValidated ? new Date(sessionDate1.getTime() + 6 * 60 * 60 * 1000) : null
        })
      }
      
      // With client 4 if exists
      if (clients[4]) {
        const sessionDate2 = new Date(weekStart)
        sessionDate2.setDate(sessionDate2.getDate() + 5) // Friday
        sessionDate2.setHours(18, 0, 0, 0)
        
        if (sessionDate2 <= today) {
          const isValidated = shouldValidate()
          sessionsData.push({
            trainerId: trainers[4].id,
            clientId: clients[4].id,
            packageId: packages[4]?.id || packages[0].id,
            locationId: uptownFitness.id,
            sessionDate: sessionDate2,
            sessionValue: 100,
            validatedAt: isValidated ? new Date(sessionDate2.getTime() + 1 * 60 * 60 * 1000) : null
          })
        }
      }
    }
  }
  
  console.log(`📊 Generated ${sessionsData.length} sessions over the past 3 months`)

  await Promise.all(
    sessionsData.map(session =>
      prisma.session.create({
        data: {
          ...session,
          validationToken: session.validatedAt ? null : `token_${Math.random().toString(36).substr(2, 9)}`,
          validationExpiry: session.validatedAt ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      })
    )
  )

  console.log('✅ Created sample sessions')

  // Create commission tiers (for future use)
  const tiersData = [
    { minSessions: 0, maxSessions: 30, percentage: 0.25 },
    { minSessions: 31, maxSessions: 60, percentage: 0.30 },
    { minSessions: 61, maxSessions: null, percentage: 0.35 }
  ]

  await Promise.all(
    tiersData.map(tier =>
      prisma.commissionTier.create({ data: tier })
    )
  )

  console.log('✅ Created commission tiers')

  console.log('🎉 Seed completed successfully!')
  console.log('\n📧 Login credentials:')
  console.log('Admin: admin@ptsession.com / admin123')
  console.log('Club Manager: manager@woodsquare.com / manager123')
  console.log('PT Manager: ptmanager@ptsession.com / manager123')
  console.log('Trainer: john@woodsquare.com / trainer123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })