import { PrismaClient, Role, SubscriptionTier, SubscriptionStatus } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')
  
  // Create Organizations
  const snapFitness = await prisma.organization.upsert({
    where: { email: 'admin@snapfitness.sg' },
    update: {},
    create: {
      name: 'Snap Fitness Singapore',
      email: 'admin@snapfitness.sg',
      phone: '+65 6789 0123',
      subscriptionTier: SubscriptionTier.SCALE,
      subscriptionStatus: SubscriptionStatus.ACTIVE
    }
  })
  
  const testOrg = await prisma.organization.upsert({
    where: { email: 'test@testgym.com' },
    update: {},
    create: {
      name: 'Test Gym',
      email: 'test@testgym.com',
      subscriptionTier: SubscriptionTier.FREE,
      subscriptionStatus: SubscriptionStatus.ACTIVE
    }
  })
  
  console.log('✅ Created 2 organizations')

  // Create or find locations (prevent duplicates) - tied to Snap Fitness organization
  const woodSquare = await prisma.location.upsert({
    where: { name: 'Wood Square' },
    update: {},
    create: {
      name: 'Wood Square',
      organizationId: snapFitness.id,  // Location belongs to Snap Fitness
      active: true
    }
  })

  const plaza888 = await prisma.location.upsert({
    where: { name: '888 Plaza' },
    update: {},
    create: {
      name: '888 Plaza',
      organizationId: snapFitness.id,  // Location belongs to Snap Fitness
      active: true
    }
  })

  const woodlandsHealth = await prisma.location.upsert({
    where: { name: 'Woodlands Health' },
    update: {},
    create: {
      name: 'Woodlands Health',
      organizationId: snapFitness.id,  // Location belongs to Snap Fitness
      active: true
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
      organizationId: snapFitness.id,  // Admin needs to belong to an organization
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
      organizationId: snapFitness.id,  // Club Manager needs to belong to an organization
      active: true
    }
  })

  const ptManager = await prisma.user.create({
    data: {
      email: 'ptmanager@ptsession.com',
      password: managerPassword,
      name: 'Mike PT Manager',
      role: Role.PT_MANAGER,
      organizationId: snapFitness.id,  // PT Manager needs to belong to an organization
      active: true
    }
  })

  console.log('✅ Created managers')

  // Create UserLocation records for managers
  await prisma.userLocation.createMany({
    data: [
      { userId: clubManager.id, locationId: woodSquare.id },
      { userId: ptManager.id, locationId: woodSquare.id },
      { userId: ptManager.id, locationId: plaza888.id }, // PT Manager has access to both
    ]
  })

  console.log('✅ Created UserLocation records for managers')

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
          organizationId: snapFitness.id,  // Trainers need to belong to an organization
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
          organizationId: snapFitness.id,  // Clients need to belong to an organization
          active: true
        }
      })
    )
  )

  console.log('✅ Created 6 clients')

  // Create packages for some clients with varied pricing
  const packagesData = [
    { clientId: clients[0].id, packageType: 'Standard', name: '12 Session Package', totalValue: 1200, totalSessions: 12, remainingSessions: 10 },
    { clientId: clients[1].id, packageType: 'Premium', name: '20 Session Package', totalValue: 2400, totalSessions: 20, remainingSessions: 18 },
    { clientId: clients[2].id, packageType: 'Starter', name: '5 Session Package', totalValue: 400, totalSessions: 5, remainingSessions: 3 },
    { clientId: clients[3].id, packageType: 'Elite', name: '30 Session Package', totalValue: 4500, totalSessions: 30, remainingSessions: 28 }
  ]

  const packages = await Promise.all(
    packagesData.map(pkg =>
      prisma.package.create({
        data: {
          ...pkg,
          sessionValue: pkg.totalValue / pkg.totalSessions,
          organizationId: snapFitness.id,  // Packages need to belong to an organization
          active: true
        }
      })
    )
  )

  console.log('✅ Created 4 packages with varied pricing')

  // Create sample sessions
  const sessionsData = [
    {
      trainerId: trainers[0].id,
      clientId: clients[0].id,
      packageId: packages[0].id,
      locationId: woodSquare.id,
      sessionDate: new Date('2024-01-15T10:00:00Z'),
      sessionValue: packagesData[0].totalValue / packagesData[0].totalSessions,
      validated: true,
      validatedAt: new Date('2024-01-15T14:00:00Z')
    },
    {
      trainerId: trainers[0].id,
      clientId: clients[0].id,
      packageId: packages[0].id,
      locationId: woodSquare.id,
      sessionDate: new Date('2024-01-17T10:00:00Z'),
      sessionValue: packagesData[0].totalValue / packagesData[0].totalSessions,
      validated: false,
      validatedAt: null // Pending validation
    },
    {
      trainerId: trainers[1].id,
      clientId: clients[1].id,
      packageId: packages[1].id,
      locationId: woodSquare.id,
      sessionDate: new Date('2024-01-16T14:00:00Z'),
      sessionValue: packagesData[1].totalValue / packagesData[1].totalSessions,
      validated: true,
      validatedAt: new Date('2024-01-16T18:00:00Z')
    },
    {
      trainerId: trainers[2].id,
      clientId: clients[2].id,
      packageId: packages[2].id,
      locationId: plaza888.id,
      sessionDate: new Date('2024-01-18T09:00:00Z'),
      sessionValue: packagesData[2].totalValue / packagesData[2].totalSessions,
      validated: true,
      validatedAt: new Date('2024-01-18T12:00:00Z')
    }
  ]

  await Promise.all(
    sessionsData.map(session =>
      prisma.session.create({
        data: {
          ...session,
          organizationId: snapFitness.id,  // Sessions need to belong to an organization
          validationToken: session.validatedAt ? null : `token_${Math.random().toString(36).substr(2, 9)}`,
          validationExpiry: session.validatedAt ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      })
    )
  )

  console.log('✅ Created sample sessions')

  // Create commission tiers
  // See /docs/COMMISSION_SYSTEM_DESIGN.md for complete commission system architecture
  // Default seed data uses Progressive Tier System (Wood Square Fitness default)
  const tiersData = [
    { minSessions: 0, maxSessions: 30, percentage: 25 },
    { minSessions: 31, maxSessions: 60, percentage: 30 },
    { minSessions: 61, maxSessions: null, percentage: 35 }
  ]

  await Promise.all(
    tiersData.map(tier =>
      prisma.commissionTier.create({ 
        data: {
          ...tier,
          organizationId: snapFitness.id  // Commission tiers belong to an organization
        }
      })
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