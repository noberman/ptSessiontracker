/**
 * Seed script to create another test organization with current month sessions
 * Run with: npx tsx prisma/seed-another-org.ts
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function createAnotherOrganization() {
  try {
    console.log('🏢 Creating Active Fitness Studio organization...')
    
    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Active Fitness Studio',
        email: 'admin@activefitness.com',
        subscriptionTier: 'PRO',
        subscriptionStatus: 'ACTIVE',
        commissionMethod: 'PROGRESSIVE',
      }
    })
    
    console.log('✅ Created organization:', org.name)
    
    // Create location
    const location = await prisma.location.create({
      data: {
        name: 'Main Studio',
        organizationId: org.id,
        active: true
      }
    })
    
    console.log('📍 Created location:', location.name)
    
    // Create admin user for the organization
    const adminPassword = await hash('admin456', 10)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@activefitness.com',
        password: adminPassword,
        name: 'Active Admin',
        role: 'ADMIN',
        organizationId: org.id,
        locationId: location.id,
        active: true,
        onboardingCompletedAt: new Date()
      }
    })
    
    console.log('👤 Created admin user:', admin.email)
    
    // Create trainers
    const trainer1Password = await hash('trainer456', 10)
    const trainer1 = await prisma.user.create({
      data: {
        email: 'emily@activefitness.com',
        password: trainer1Password,
        name: 'Emily Trainer',
        role: 'TRAINER',
        organizationId: org.id,
        locationId: location.id,
        active: true
      }
    })
    
    const trainer2 = await prisma.user.create({
      data: {
        email: 'david@activefitness.com',
        password: trainer1Password,
        name: 'David Coach',
        role: 'TRAINER',
        organizationId: org.id,
        locationId: location.id,
        active: true
      }
    })
    
    console.log('🏋️ Created trainers:', trainer1.email, ',', trainer2.email)
    
    // Create multiple clients
    const clients = await Promise.all([
      prisma.client.create({
        data: {
          name: 'Alex Thompson',
          email: 'alex@example.com',
          organizationId: org.id,
          locationId: location.id,
          primaryTrainerId: trainer1.id,
          active: true
        }
      }),
      prisma.client.create({
        data: {
          name: 'Jessica Lee',
          email: 'jessica@example.com',
          organizationId: org.id,
          locationId: location.id,
          primaryTrainerId: trainer1.id,
          active: true
        }
      }),
      prisma.client.create({
        data: {
          name: 'Robert Chen',
          email: 'robert@example.com',
          organizationId: org.id,
          locationId: location.id,
          primaryTrainerId: trainer2.id,
          active: true
        }
      }),
      prisma.client.create({
        data: {
          name: 'Maria Garcia',
          email: 'maria@example.com',
          organizationId: org.id,
          locationId: location.id,
          primaryTrainerId: trainer2.id,
          active: true
        }
      })
    ])
    
    console.log('👥 Created', clients.length, 'clients')
    
    // Create packages for clients
    const packages = await Promise.all([
      prisma.package.create({
        data: {
          clientId: clients[0].id,
          organizationId: org.id,
          name: '20 Session Package',
          totalSessions: 20,
          remainingSessions: 12,
          totalValue: 1000,
          sessionValue: 50,
          active: true
        }
      }),
      prisma.package.create({
        data: {
          clientId: clients[1].id,
          organizationId: org.id,
          name: '30 Session Package',
          totalSessions: 30,
          remainingSessions: 25,
          totalValue: 1350,
          sessionValue: 45,
          active: true
        }
      }),
      prisma.package.create({
        data: {
          clientId: clients[2].id,
          organizationId: org.id,
          name: '10 Session Package',
          totalSessions: 10,
          remainingSessions: 3,
          totalValue: 600,
          sessionValue: 60,
          active: true
        }
      }),
      prisma.package.create({
        data: {
          clientId: clients[3].id,
          organizationId: org.id,
          name: '15 Session Package',
          totalSessions: 15,
          remainingSessions: 10,
          totalValue: 750,
          sessionValue: 50,
          active: true
        }
      })
    ])
    
    console.log('📦 Created', packages.length, 'packages')
    
    // Create sessions for September 2025
    const now = new Date()
    const september2025 = new Date(2025, 8, 1) // Month is 0-indexed, so 8 = September
    
    // Sessions throughout September 2025
    const sessionDates = [
      new Date(2025, 8, 2),  // Sep 2
      new Date(2025, 8, 4),  // Sep 4
      new Date(2025, 8, 6),  // Sep 6
      new Date(2025, 8, 9),  // Sep 9
      new Date(2025, 8, 11), // Sep 11
      new Date(2025, 8, 13), // Sep 13
      new Date(2025, 8, 16), // Sep 16
      new Date(2025, 8, 18), // Sep 18
      new Date(2025, 8, 20), // Sep 20
      new Date(2025, 8, 23), // Sep 23
      new Date(2025, 8, 25), // Sep 25
      new Date(2025, 8, 27), // Sep 27
      new Date(2025, 8, 28), // Sep 28 (today-ish)
      new Date(2025, 8, 29), // Sep 29 (upcoming)
    ]
    
    const sessions = []
    
    // Create sessions for trainer 1
    for (let i = 0; i < 8; i++) {
      sessions.push({
        trainerId: trainer1.id,
        clientId: clients[i % 2].id, // Alternate between first two clients
        packageId: packages[i % 2].id,
        locationId: location.id,
        organizationId: org.id,
        sessionDate: sessionDates[i],
        sessionValue: i % 2 === 0 ? 50 : 45,
        validated: i < 6, // First 6 are validated
        validatedAt: i < 6 ? sessionDates[i] : null
      })
    }
    
    // Create sessions for trainer 2
    for (let i = 0; i < 6; i++) {
      sessions.push({
        trainerId: trainer2.id,
        clientId: clients[2 + (i % 2)].id, // Alternate between last two clients
        packageId: packages[2 + (i % 2)].id,
        locationId: location.id,
        organizationId: org.id,
        sessionDate: sessionDates[i + 8],
        sessionValue: i % 2 === 0 ? 60 : 50,
        validated: i < 4, // First 4 are validated
        validatedAt: i < 4 ? sessionDates[i + 8] : null
      })
    }
    
    await prisma.session.createMany({
      data: sessions
    })
    
    console.log('💪 Created', sessions.length, 'sessions for September 2025')
    
    // Create commission tiers for the organization
    await prisma.commissionTier.createMany({
      data: [
        { organizationId: org.id, minSessions: 1, maxSessions: 15, percentage: 45 },
        { organizationId: org.id, minSessions: 16, maxSessions: 30, percentage: 55 },
        { organizationId: org.id, minSessions: 31, maxSessions: null, percentage: 65 }
      ]
    })
    
    console.log('💰 Created commission tiers')
    
    console.log('\n✅ Active Fitness Studio setup complete!')
    console.log('\n📋 Summary:')
    console.log('  Organization: Active Fitness Studio')
    console.log('  Admin login: admin@activefitness.com / admin456')
    console.log('  Trainers: 2 (Emily & David)')
    console.log('  Clients: 4')
    console.log('  Sessions: 14 total (10 validated, 4 pending)')
    console.log('  Session dates: September 2025')
    console.log('\nThis organization has current month activity for testing!')
    
  } catch (error) {
    console.error('❌ Error creating organization:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed
createAnotherOrganization()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })