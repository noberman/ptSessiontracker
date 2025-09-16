import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CommissionDashboard } from '@/components/commission/CommissionDashboard'
import { calculateMonthlyCommissions, getCommissionMethod } from '@/lib/commission/calculator'
import { prisma } from '@/lib/prisma'

export default async function CommissionPage({
  searchParams
}: {
  searchParams: Promise<{ 
    month?: string
    method?: 'PROGRESSIVE' | 'GRADUATED'
    locationId?: string
  }>
}) {
  const params = await searchParams
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }
  
  // Check permissions - Trainers see their personal view
  if (session.user.role === 'TRAINER') {
    redirect('/my-commission')
  }
  
  // Get current month or from params
  const currentDate = new Date()
  const monthParam = params.month || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  const [year, month] = monthParam.split('-').map(Number)
  const selectedMonth = new Date(year, month - 1)
  
  // Get commission method
  const method = params.method || await getCommissionMethod()
  
  // Get location filter for club managers
  let locationId = params.locationId
  if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    locationId = session.user.locationId
  }
  
  // Calculate commissions
  const commissions = await calculateMonthlyCommissions(
    selectedMonth,
    locationId,
    method
  )
  
  // Get commission tiers for display
  const tiers = await prisma.commissionTier.findMany({
    orderBy: { minSessions: 'asc' }
  })
  
  // Get locations for filter (admins and PT managers only)
  let locations: Array<{ id: string; name: string }> = []
  if (session.user.role === 'ADMIN' || session.user.role === 'PT_MANAGER') {
    locations = await prisma.location.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  }
  
  // Calculate totals
  const totals = {
    totalSessions: commissions.reduce((sum, c) => sum + c.totalSessions, 0),
    totalValue: commissions.reduce((sum, c) => sum + c.totalValue, 0),
    totalCommission: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
    trainerCount: commissions.length
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Commission Report</h1>
          <p className="text-sm text-text-secondary mt-1">
            Monthly commission calculations for trainer payroll
          </p>
        </div>
      </div>
      
      <CommissionDashboard
        commissions={commissions}
        totals={totals}
        month={monthParam}
        method={method}
        tiers={tiers.map(t => ({
          minSessions: t.minSessions,
          maxSessions: t.maxSessions,
          percentage: t.percentage
        }))}
        locations={locations}
        selectedLocationId={locationId}
        currentUserRole={session.user.role}
      />
    </div>
  )
}