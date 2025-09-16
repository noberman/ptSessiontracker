import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TrainerCommissionView } from '@/components/commission/TrainerCommissionView'
import { calculateTrainerCommission, getCommissionMethod } from '@/lib/commission/calculator'
import { prisma } from '@/lib/prisma'

export default async function MyCommissionPage({
  searchParams
}: {
  searchParams: Promise<{ 
    month?: string
    method?: 'PROGRESSIVE' | 'GRADUATED'
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
  const selectedMonth = new Date(year, month - 1)
  
  // Get commission method
  const method = params.method || await getCommissionMethod()
  
  // Calculate trainer's commission
  const commission = await calculateTrainerCommission(
    session.user.id,
    selectedMonth,
    method
  )
  
  // Get commission tiers for display
  const tiers = await prisma.commissionTier.findMany({
    orderBy: { minSessions: 'asc' }
  })
  
  // Get recent validated sessions for this month
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)
  
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
        method={method}
        tiers={tiers.map(t => ({
          minSessions: t.minSessions,
          maxSessions: t.maxSessions,
          percentage: t.percentage
        }))}
        recentSessions={recentSessions.map(s => ({
          id: s.id,
          sessionDate: s.sessionDate.toISOString(),
          clientName: s.client.name,
          packageName: s.package?.name || 'N/A',
          sessionValue: s.sessionValue,
          validated: s.validated
        }))}
      />
    </div>
  )
}