#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting commission test data seed...')
  
  // Get the organization (assuming it exists)
  const org = await prisma.organization.findFirst()
  if (!org) {
    throw new Error('No organization found. Please run initial setup first.')
  }
  console.log(`📍 Using organization: ${org.name}`)
  
  // Get or create a location
  let location = await prisma.location.findFirst({
    where: { organizationId: org.id }
  })
  
  if (!location) {
    location = await prisma.location.create({
      data: {
        name: 'Main Gym',
        organizationId: org.id,
        active: true
      }
    })
    console.log('📍 Created location: Main Gym')
  }
  
  // Get commission profiles
  const profiles = await prisma.commissionProfile.findMany({
    where: { 
      organizationId: org.id,
      isActive: true 
    }
  })
  
  if (profiles.length === 0) {
    throw new Error('No commission profiles found. Please create profiles first.')
  }
  
  const defaultProfile = profiles.find(p => p.isDefault) || profiles[0]
  console.log(`💼 Using commission profile: ${defaultProfile.name}`)
  
  // Create trainers with different session counts
  const trainerConfigs = [
    { name: 'Alex Johnson', sessions: 10, packages: 1, packageValue: 2000 },
    { name: 'Sarah Williams', sessions: 20, packages: 2, packageValue: 2500 },
    { name: 'Mike Chen', sessions: 30, packages: 2, packageValue: 3000 },
    { name: 'Emma Davis', sessions: 40, packages: 3, packageValue: 5000 },
    { name: 'James Wilson', sessions: 50, packages: 4, packageValue: 4000 }
  ]
  
  const hashedPassword = await bcrypt.hash('password123', 10)
  const currentMonth = new Date()
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  
  for (const config of trainerConfigs) {
    console.log(`\n👤 Creating trainer: ${config.name}`)
    
    // Check if trainer exists
    let trainer = await prisma.user.findFirst({
      where: {
        email: `${config.name.toLowerCase().replace(' ', '.')}@gym.com`,
        organizationId: org.id
      }
    })
    
    if (!trainer) {
      // Create trainer
      trainer = await prisma.user.create({
        data: {
          name: config.name,
          email: `${config.name.toLowerCase().replace(' ', '.')}@gym.com`,
          password: hashedPassword,
          role: 'TRAINER',
          organizationId: org.id,
          commissionProfileId: defaultProfile.id,
          active: true,
          locations: {
            create: {
              locationId: location.id
            }
          }
        }
      })
      console.log(`  ✅ Created trainer`)
    } else {
      // Update trainer to ensure they have a commission profile
      await prisma.user.update({
        where: { id: trainer.id },
        data: {
          commissionProfileId: defaultProfile.id
        }
      })
      console.log(`  ✅ Updated existing trainer`)
    }
    
    // Create clients for this trainer
    const clientCount = Math.ceil(config.sessions / 5) // Roughly 5 sessions per client
    const clients = []
    
    for (let i = 1; i <= clientCount; i++) {
      const clientName = `${config.name.split(' ')[0]}'s Client ${i}`
      
      let client = await prisma.client.findFirst({
        where: {
          email: `${clientName.toLowerCase().replace(/[' ]/g, '')}@client.com`,
          organizationId: org.id
        }
      })
      
      if (!client) {
        client = await prisma.client.create({
          data: {
            name: clientName,
            email: `${clientName.toLowerCase().replace(/[' ]/g, '')}@client.com`,
            phone: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            organizationId: org.id,
            locationId: location.id,
            primaryTrainerId: trainer.id,
            active: true
          }
        })
      }
      clients.push(client)
    }
    console.log(`  ✅ Created/found ${clients.length} clients`)
    
    // Create packages for this trainer's clients
    const packages = []
    for (let i = 0; i < config.packages; i++) {
      const client = clients[i % clients.length]
      const packageValue = config.packageValue + (Math.random() * 1000 - 500) // Add some variation
      const sessionsInPackage = Math.floor(packageValue / 100) // Rough $100 per session
      
      const pkg = await prisma.package.create({
        data: {
          clientId: client.id,
          name: `${sessionsInPackage} Session Package`,
          totalValue: packageValue,
          totalSessions: sessionsInPackage,
          remainingSessions: sessionsInPackage - 5, // Use some sessions
          sessionValue: packageValue / sessionsInPackage,
          organizationId: org.id,
          active: true,
          startDate: startOfMonth,
          createdAt: new Date(startOfMonth.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000) // Random day in first 5 days
        }
      })
      packages.push(pkg)
    }
    console.log(`  ✅ Created ${packages.length} packages totaling $${packages.reduce((sum, p) => sum + p.totalValue, 0).toFixed(2)}`)
    
    // Delete existing sessions for this trainer in the current month (to avoid duplicates)
    await prisma.session.deleteMany({
      where: {
        trainerId: trainer.id,
        sessionDate: {
          gte: startOfMonth
        }
      }
    })
    
    // Create sessions distributed throughout the month
    const sessionsToCreate = config.sessions
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
    
    for (let i = 0; i < sessionsToCreate; i++) {
      const client = clients[i % clients.length]
      const pkg = packages.find(p => p.clientId === client.id) || packages[0]
      
      // Distribute sessions evenly across the month
      const dayOffset = Math.floor((i / sessionsToCreate) * daysInMonth)
      const sessionDate = new Date(startOfMonth)
      sessionDate.setDate(sessionDate.getDate() + dayOffset)
      sessionDate.setHours(9 + Math.floor(Math.random() * 10), 0, 0, 0) // Random hour 9am-7pm
      
      // Make sure session date is not in the future
      if (sessionDate > new Date()) {
        sessionDate.setTime(new Date().getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Within last week
      }
      
      await prisma.session.create({
        data: {
          trainerId: trainer.id,
          clientId: client.id,
          packageId: pkg?.id,
          locationId: location.id,
          sessionDate,
          sessionValue: pkg?.sessionValue || 100,
          validated: true, // All validated for commission calculation
          validatedAt: new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000), // Validated next day
          organizationId: org.id,
          notes: `Test session ${i + 1} for commission testing`
        }
      })
    }
    console.log(`  ✅ Created ${sessionsToCreate} validated sessions`)
  }
  
  console.log('\n🎉 Commission test data seeded successfully!')
  console.log('\n📊 Summary:')
  console.log('  - 5 trainers with 10, 20, 30, 40, and 50 sessions')
  console.log('  - Packages ranging from $2,000 to $5,000')
  console.log('  - All sessions validated for commission calculation')
  console.log('\n🔐 Trainer credentials:')
  console.log('  Email: [firstname.lastname]@gym.com')
  console.log('  Password: password123')
  console.log('\nExample: alex.johnson@gym.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })