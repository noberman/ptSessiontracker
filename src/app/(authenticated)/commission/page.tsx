import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CommissionDashboard } from '@/components/commission/CommissionDashboardSimple'
import { calculateMonthlyCommissions } from '@/lib/commission/calculator'
import { prisma } from '@/lib/prisma'
import { ensureCommissionTiers } from '@/lib/commission/ensure-tiers'

export default async function CommissionPage({
  searchParams
}: {
  searchParams: Promise<{ 
    month?: string
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
  
  // Get organization ID
  const organizationId = session.user.organizationId
  
  // Ensure commission tiers exist (creates defaults if empty)
  if (organizationId) {
    await ensureCommissionTiers(organizationId)
  }
  
  // Get current month or from params
  const currentDate = new Date()
  const monthParam = params.month || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  const [year, month] = monthParam.split('-').map(Number)
  const selectedMonth = new Date(year, month - 1)
  
  // Get commission method from organization settings
  let method: 'PROGRESSIVE' | 'GRADUATED' = 'PROGRESSIVE'
  
  if (organizationId) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { commissionMethod: true }
    })
    method = (organization?.commissionMethod || 'PROGRESSIVE') as 'PROGRESSIVE' | 'GRADUATED'
  }
  
  // Get location filter for club managers
  let locationId = params.locationId
  if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    locationId = session.user.locationId
  }
  
  // Calculate commissions
  const commissions = await calculateMonthlyCommissions(
    selectedMonth,
    locationId,
    method,
    organizationId // Pass organizationId to filter trainers
  )
  
  // Get locations for filter (admins and PT managers only)
  let locations: Array<{ id: string; name: string }> = []
  if (session.user.role === 'ADMIN' || session.user.role === 'PT_MANAGER') {
    locations = await prisma.location.findMany({
      where: { organizationId }, // Filter locations by organization
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
        locations={locations}
        selectedLocationId={locationId}
        currentUserRole={session.user.role}
      />
    </div>
  )
}