/**
 * Seed script to create test organization for super admin testing
 * Run with: npx tsx prisma/seed-test-org.ts
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function createTestOrganization() {
  try {
    console.log('🏢 Creating test organization...')
    
    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Beta Fitness Club',
        email: 'admin@betafitness.com',
        subscriptionTier: 'GROWTH',
        subscriptionStatus: 'ACTIVE',
        commissionMethod: 'PROGRESSIVE',
      }
    })
    
    console.log('✅ Created organization:', org.name)
    
    // Create location
    const location = await prisma.location.create({
      data: {
        name: 'Downtown Location',
        organizationId: org.id,
        active: true
      }
    })
    
    console.log('📍 Created location:', location.name)
    
    // Create admin user for the organization
    const adminPassword = await hash('admin123', 10)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@betafitness.com',
        password: adminPassword,
        name: 'Beta Admin',
        role: 'ADMIN',
        organizationId: org.id,
        active: true,
        onboardingCompletedAt: new Date()
      }
    })
    
    console.log('👤 Created admin user:', admin.email)
    
    // Create a trainer
    const trainerPassword = await hash('trainer123', 10)
    const trainer = await prisma.user.create({
      data: {
        email: 'john@betafitness.com',
        password: trainerPassword,
        name: 'John Trainer',
        role: 'TRAINER',
        organizationId: org.id,
        active: true
      }
    })
    
    console.log('🏋️ Created trainer:', trainer.email)
    
    // Create UserLocation records
    await prisma.userLocation.createMany({
      data: [
        { userId: admin.id, locationId: location.id },
        { userId: trainer.id, locationId: location.id },
      ]
    })
    
    console.log('✅ Created UserLocation records')
    
    // Create some clients
    const client1 = await prisma.client.create({
      data: {
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        organizationId: org.id,
        locationId: location.id,
        primaryTrainerId: trainer.id,
        active: true
      }
    })
    
    const client2 = await prisma.client.create({
      data: {
        name: 'Mike Smith',
        email: 'mike@example.com',
        organizationId: org.id,
        locationId: location.id,
        primaryTrainerId: trainer.id,
        active: true
      }
    })
    
    console.log('👥 Created clients:', client1.name, ',', client2.name)
    
    // Create packages for clients
    const package1 = await prisma.package.create({
      data: {
        clientId: client1.id,
        organizationId: org.id,
        name: '10 Session Package',
        totalSessions: 10,
        remainingSessions: 7,
        totalValue: 500,
        sessionValue: 50,
        active: true
      }
    })
    
    const package2 = await prisma.package.create({
      data: {
        clientId: client2.id,
        organizationId: org.id,
        name: '20 Session Package',
        totalSessions: 20,
        remainingSessions: 15,
        totalValue: 900,
        sessionValue: 45,
        active: true
      }
    })
    
    console.log('📦 Created packages')
    
    // Create some sessions
    const today = new Date()
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    await prisma.session.createMany({
      data: [
        {
          trainerId: trainer.id,
          clientId: client1.id,
          packageId: package1.id,
          organizationId: org.id,
          locationId: location.id,
          sessionDate: lastWeek,
          sessionValue: 50,
          validated: true,
          validatedAt: lastWeek
        },
        {
          trainerId: trainer.id,
          clientId: client1.id,
          packageId: package1.id,
          organizationId: org.id,
          locationId: location.id,
          sessionDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
          sessionValue: 50,
          validated: true,
          validatedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
        },
        {
          trainerId: trainer.id,
          clientId: client2.id,
          packageId: package2.id,
          organizationId: org.id,
          locationId: location.id,
          sessionDate: today,
          sessionValue: 45,
          validated: false
        }
      ]
    })
    
    console.log('💪 Created test sessions')
    
    // Create commission tiers for the organization
    await prisma.commissionTier.createMany({
      data: [
        { organizationId: org.id, minSessions: 1, maxSessions: 10, percentage: 40 },
        { organizationId: org.id, minSessions: 11, maxSessions: 20, percentage: 50 },
        { organizationId: org.id, minSessions: 21, maxSessions: null, percentage: 60 }
      ]
    })
    
    console.log('💰 Created commission tiers')
    
    // Add a note about this being a test org
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        adminNotes: 'Test organization created for super admin feature testing',
        lastIssue: 'Test issue: Commission calculation seems off',
        lastIssueDate: new Date()
      }
    })
    
    console.log('\n✅ Test organization setup complete!')
    console.log('\n📋 Summary:')
    console.log('  Organization: Beta Fitness Club')
    console.log('  Admin login: admin@betafitness.com / admin123')
    console.log('  Trainer login: john@betafitness.com / trainer123')
    console.log('  Clients: 2')
    console.log('  Sessions: 3 (2 validated, 1 pending)')
    console.log('\nYou can now test:')
    console.log('  - Login As feature')
    console.log('  - Export organization data')
    console.log('  - View/edit notes')
    
  } catch (error) {
    console.error('❌ Error creating test organization:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed
createTestOrganization()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })