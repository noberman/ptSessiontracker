import { prisma } from '../../../src/lib/prisma'
import { ensureCommissionTiers } from '../../../src/lib/commission/ensure-tiers'

async function checkSessions() {
  try {
    // Check and ensure commission tiers first
    console.log('\n📊 Checking commission tiers...')
    const tierCount = await prisma.commissionTier.count()
    console.log(`   Found ${tierCount} commission tiers in database`)
    
    if (tierCount === 0) {
      console.log('   ⚠️  No tiers found! Creating defaults...')
      const created = await ensureCommissionTiers()
      if (created) {
        console.log('   ✅ Default tiers created successfully')
        
        // Show the created tiers
        const tiers = await prisma.commissionTier.findMany({
          orderBy: { minSessions: 'asc' }
        })
        console.log('   Created tiers:')
        tiers.forEach(tier => {
          console.log(`   - ${tier.minSessions}-${tier.maxSessions || '∞'}: ${tier.percentage}%`)
        })
      }
    } else {
      const tiers = await prisma.commissionTier.findMany({
        orderBy: { minSessions: 'asc' }
      })
      console.log('   Existing tiers:')
      tiers.forEach(tier => {
        console.log(`   - ${tier.minSessions}-${tier.maxSessions || '∞'}: ${tier.percentage}%`)
      })
    }

    // Get total session count
    const totalSessions = await prisma.session.count()
    console.log(`\n📊 Total sessions in database: ${totalSessions}`)

    // Get sessions from today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todaysSessions = await prisma.session.count({
      where: {
        sessionDate: {
          gte: today,
          lt: tomorrow
        }
      }
    })
    console.log(`📅 Sessions created today: ${todaysSessions}`)

    // Get sessions from this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const thisMonthSessions = await prisma.session.count({
      where: {
        sessionDate: {
          gte: startOfMonth
        }
      }
    })
    console.log(`📆 Sessions this month (from ${startOfMonth.toLocaleDateString()}): ${thisMonthSessions}`)

    // Get 5 most recent sessions with details
    const recentSessions = await prisma.session.findMany({
      take: 5,
      orderBy: { sessionDate: 'desc' },
      include: {
        trainer: { select: { name: true, role: true } },
        client: { select: { name: true } },
        location: { select: { name: true } }
      }
    })

    console.log('\n🔍 Recent sessions:')
    recentSessions.forEach(session => {
      console.log(`  - ${session.sessionDate.toLocaleDateString()} | Trainer: ${session.trainer.name} | Client: ${session.client.name} | Location: ${session.location?.name || 'N/A'} | Validated: ${session.validated}`)
    })

    // Check for users and their roles
    const users = await prisma.user.findMany({
      select: { name: true, role: true, locationId: true, active: true }
    })
    
    console.log('\n👥 Users in system:')
    users.forEach(user => {
      console.log(`  - ${user.name}: ${user.role} | Location: ${user.locationId || 'None'} | Active: ${user.active}`)
    })

  } catch (error) {
    console.error('Error checking sessions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSessions()