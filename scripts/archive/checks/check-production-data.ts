import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkProductionData() {
  try {
    console.log('🔍 Checking Production Database...\n')
    
    // Check users
    const userCount = await prisma.user.count()
    console.log(`Total Users: ${userCount}`)
    
    // Check for admin users
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true, name: true, createdAt: true }
    })
    
    console.log(`\nAdmin Users (${admins.length}):`)
    admins.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.name}) - Created: ${admin.createdAt.toLocaleDateString()}`)
    })
    
    // Check sessions
    const sessionCount = await prisma.session.count()
    console.log(`\nTotal Sessions: ${sessionCount}`)
    
    // Check clients
    const clientCount = await prisma.client.count()
    console.log(`Total Clients: ${clientCount}`)
    
    // Check packages
    const packageCount = await prisma.package.count()
    console.log(`Total Packages: ${packageCount}`)
    
    // Check locations
    const locations = await prisma.location.findMany({
      select: { name: true }
    })
    console.log(`\nLocations (${locations.length}):`)
    locations.forEach(loc => console.log(`  - ${loc.name}`))
    
    // Check commission tiers
    const tiers = await prisma.commissionTier.findMany({
      orderBy: { minSessions: 'asc' }
    })
    console.log(`\nCommission Tiers (${tiers.length}):`)
    tiers.forEach(tier => {
      console.log(`  - ${tier.minSessions}-${tier.maxSessions || '+'}: ${tier.percentage}%`)
    })
    
    // Get most recent session date to see if there's recent activity
    const recentSession = await prisma.session.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, sessionDate: true }
    })
    
    if (recentSession) {
      console.log(`\nMost Recent Session: ${recentSession.sessionDate.toLocaleDateString()} (Created: ${recentSession.createdAt.toLocaleDateString()})`)
    }
    
    // Check if this looks like seed data or real data
    console.log('\n📊 Data Analysis:')
    if (admins.some(a => a.email === 'admin@ptsession.com')) {
      console.log('⚠️  Default seed admin account found (admin@ptsession.com)')
    }
    
    if (userCount === 0) {
      console.log('❌ DATABASE IS EMPTY - No users found!')
    } else if (userCount <= 10 && sessionCount <= 10) {
      console.log('⚠️  This appears to be seed data (low record counts)')
    } else {
      console.log('✅ This appears to be production data')
    }
    
  } catch (error) {
    console.error('Error checking database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkProductionData()