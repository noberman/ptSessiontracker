import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TrainerCommissionView } from '@/components/commission/TrainerCommissionView'
import { CommissionCalculatorV2 } from '@/lib/commission/v2/CommissionCalculatorV2'
import { prisma } from '@/lib/prisma'
import { getMonthBoundariesInUtc } from '@/utils/timezone'

export default async function MyCommissionPage({
  searchParams
}: {
  searchParams: Promise<{ 
    month?: string
  }>
}) {
  const params = await searchParams
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }
  
  // Only trainers can access this page
  if (session.user.role !== 'TRAINER') {
    redirect('/commission')
  }
  
  // Get current month or from params
  const currentDate = new Date()
  const monthParam = params.month || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  const [year, month] = monthParam.split('-').map(Number)
  
  // Get trainer with commission profile and organization
  const trainer = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      commissionProfile: {
        include: {
          tiers: {
            orderBy: { tierLevel: 'asc' }
          }
        }
      },
      organization: {
        select: { timezone: true }
      }
    }
  })
  
  if (!trainer?.commissionProfile) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-text-primary mb-4">My Commission</h1>
        <p className="text-text-secondary">No commission profile assigned. Please contact your manager.</p>
      </div>
    )
  }
  
  const organizationId = trainer.organizationId
  const orgTimezone = trainer.organization?.timezone || 'Asia/Singapore'
  
  // Calculate date range for the selected month in UTC (for database queries)
  const { start: startOfMonth, end: endOfMonth } = getMonthBoundariesInUtc(year, month, orgTimezone)
  
  // Calculate trainer's commission using v2
  const calculator = new CommissionCalculatorV2()
  const calculation = await calculator.calculateCommission(
    session.user.id,
    { start: startOfMonth, end: endOfMonth },
    { saveCalculation: false }
  )
  
  // Get all sessions to calculate total value
  const allSessions = await prisma.session.findMany({
    where: {
      trainerId: session.user.id,
      sessionDate: {
        gte: startOfMonth,
        lte: endOfMonth
      },
      validated: true,
      cancelled: false
    },
    select: { sessionValue: true }
  })
  
  const totalValue = allSessions.reduce((sum, s) => sum + s.sessionValue, 0)
  
  // Format commission data for the view component
  const commission = {
    trainerId: trainer.id,
    trainerName: trainer.name,
    totalSessions: calculation.totalSessions,
    totalValue,
    commissionAmount: calculation.totalCommission,
    tierReached: calculation.tierReached || 1,
    breakdown: {
      sessionCommission: calculation.sessionCommission,
      salesCommission: calculation.salesCommission || 0,
      tierBonus: calculation.tierBonus || 0
    },
    profileName: trainer.commissionProfile.name,
    calculationMethod: trainer.commissionProfile.calculationMethod
  }
  
  // Use tiers from the trainer's profile
  const tiers = trainer.commissionProfile.tiers.map(tier => ({
    minSessions: tier.sessionThreshold || 0,
    maxSessions: null,
    percentage: tier.sessionCommissionPercent || 0,
    flatFee: tier.sessionFlatFee,
    tierBonus: tier.tierBonus,
    tierLevel: tier.tierLevel
  }))
  
  // Get recent validated sessions for this month
  const recentSessions = await prisma.session.findMany({
    where: {
      trainerId: session.user.id,
      sessionDate: {
        gte: startOfMonth,
        lte: endOfMonth
      },
      validated: true,
      cancelled: false
    },
    include: {
      client: {
        select: {
          name: true
        }
      },
      package: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      sessionDate: 'desc'
    },
    take: 10
  })
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Commission</h1>
        <p className="text-sm text-text-secondary mt-1">
          Track your monthly commission and progress
        </p>
      </div>
      
      <TrainerCommissionView
        commission={commission}
        month={monthParam}
        method={commission.calculationMethod as string}
        tiers={tiers}
        recentSessions={recentSessions.map(s => ({
          id: s.id,
          sessionDate: s.sessionDate.toISOString(),
          clientName: s.client.name,
          packageName: s.package?.name || 'N/A',
          sessionValue: s.sessionValue,
          validated: s.validated
        }))}
        orgTimezone={orgTimezone}
      />
    </div>
  )
}