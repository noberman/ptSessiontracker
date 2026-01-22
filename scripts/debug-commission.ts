import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugCommission() {
  console.log('=== Commission Debug Script ===\n')

  // Find David Magar
  const david = await prisma.user.findFirst({
    where: {
      email: 'davidmagar215@gmail.com'
    },
    include: {
      organization: true,
      commissionProfile: {
        include: {
          tiers: true
        }
      },
      locations: {
        include: {
          location: true
        }
      }
    }
  })

  if (!david) {
    console.log('❌ David Magar not found!')
    return
  }

  console.log('✅ Found David Magar:')
  console.log(`   ID: ${david.id}`)
  console.log(`   Email: ${david.email}`)
  console.log(`   Role: ${david.role}`)
  console.log(`   Active: ${david.active}`)
  console.log(`   Organization ID: ${david.organizationId}`)
  console.log(`   Commission Profile ID: ${david.commissionProfileId}`)
  console.log(`   Locations: ${david.locations.map(l => l.location.name).join(', ')}`)

  console.log('\n--- Commission Profile ---')
  if (david.commissionProfile) {
    console.log(`   Profile Name: ${david.commissionProfile.name}`)
    console.log(`   Calculation Method: ${david.commissionProfile.calculationMethod}`)
    console.log(`   Trigger Type: ${david.commissionProfile.triggerType}`)
    console.log(`   Tiers Count: ${david.commissionProfile.tiers.length}`)

    if (david.commissionProfile.tiers.length > 0) {
      console.log('   Tiers:')
      david.commissionProfile.tiers.forEach((tier, i) => {
        console.log(`     Tier ${tier.tierLevel}: sessionThreshold=${tier.sessionThreshold}, sessionCommissionPercent=${tier.sessionCommissionPercent}, sessionFlatFee=${tier.sessionFlatFee}`)
      })
    } else {
      console.log('   ⚠️  NO TIERS DEFINED!')
    }
  } else {
    console.log('   ⚠️  NO COMMISSION PROFILE!')
  }

  // Now let's check what the commission page query returns
  console.log('\n--- Commission Page Query Test ---')
  const organizationId = david.organizationId

  const trainersFromQuery = await prisma.user.findMany({
    where: {
      organizationId,
      role: {
        in: ['TRAINER', 'PT_MANAGER']
      },
      active: true,
      commissionProfileId: { not: null }
    },
    select: {
      id: true,
      name: true,
      email: true,
      commissionProfile: {
        include: {
          tiers: {
            orderBy: { tierLevel: 'asc' }
          }
        }
      }
    }
  })

  console.log(`Found ${trainersFromQuery.length} trainers from query`)

  const davidInQuery = trainersFromQuery.find(t => t.email === 'davidmagar215@gmail.com')
  if (davidInQuery) {
    console.log('✅ David IS in the query results')
    console.log(`   Profile: ${davidInQuery.commissionProfile?.name}`)
    console.log(`   Tiers: ${davidInQuery.commissionProfile?.tiers?.length || 0}`)
  } else {
    console.log('❌ David is NOT in the query results!')
    console.log('   Checking why...')

    // Check each condition
    console.log(`   - organizationId matches: ${david.organizationId === organizationId}`)
    console.log(`   - role is TRAINER or PT_MANAGER: ${['TRAINER', 'PT_MANAGER'].includes(david.role)}`)
    console.log(`   - active is true: ${david.active}`)
    console.log(`   - commissionProfileId is not null: ${david.commissionProfileId !== null}`)
  }

  // Check David's sessions this month
  console.log('\n--- David\'s Sessions This Month ---')
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const sessions = await prisma.session.findMany({
    where: {
      trainerId: david.id,
      sessionDate: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    },
    select: {
      id: true,
      sessionDate: true,
      sessionValue: true,
      validated: true,
      cancelled: true
    }
  })

  console.log(`Total sessions: ${sessions.length}`)
  console.log(`Validated sessions: ${sessions.filter(s => s.validated && !s.cancelled).length}`)
  console.log(`Total value: $${sessions.reduce((sum, s) => sum + s.sessionValue, 0).toFixed(2)}`)

  await prisma.$disconnect()
}

debugCommission().catch(console.error)
