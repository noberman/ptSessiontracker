import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CommissionDashboard } from '@/components/commission/CommissionDashboardSimple'
import { CommissionCalculatorV2 } from '@/lib/commission/v2/CommissionCalculatorV2'
import { prisma } from '@/lib/prisma'

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
  
  if (!organizationId) {
    return <div>Organization not found</div>
  }
  
  // Get current month or from params
  const currentDate = new Date()
  const monthParam = params.month || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  const [year, month] = monthParam.split('-').map(Number)
  const selectedMonth = new Date(year, month - 1)
  
  // Get date range for the selected month
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)
  
  // Get location filter for club managers
  let locationId = params.locationId
  if (session.user.role === 'CLUB_MANAGER') {
    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { locations: true }
    })
    
    // Use first accessible location if no locationId provided
    if (manager?.locations && manager.locations.length > 0) {
      locationId = locationId || manager.locations[0].locationId
      // Verify they have access to the requested location
      const hasAccess = manager.locations.some(l => l.locationId === locationId)
      if (!hasAccess) {
        locationId = manager.locations[0].locationId
      }
    }
  }
  
  // Get all trainers and PT managers with commission profiles
  const trainers = await prisma.user.findMany({
    where: {
      organizationId,
      role: {
        in: ['TRAINER', 'PT_MANAGER']
      },
      active: true,
      commissionProfileId: { not: null },
      ...(locationId ? {
        locations: {
          some: { locationId }
        }
      } : {})
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
  
  // Calculate commissions using v2 calculator
  const calculator = new CommissionCalculatorV2()
  const commissionCalculations = []
  
  for (const trainer of trainers) {
    try {
      const calculation = await calculator.calculateCommission(
        trainer.id,
        { start: startOfMonth, end: endOfMonth },
        { saveCalculation: false } // Don't save, just calculate for display
      )
      
      // Get trainer's sessions for the period to show details
      const sessions = await prisma.session.findMany({
        where: {
          trainerId: trainer.id,
          sessionDate: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          validated: true,
          cancelled: false
        },
        select: {
          sessionValue: true
        }
      })
      
      const totalValue = sessions.reduce((sum, s) => sum + s.sessionValue, 0)
      
      commissionCalculations.push({
        trainerId: trainer.id,
        trainerName: trainer.name,
        trainerEmail: trainer.email,
        totalSessions: calculation.totalSessions,
        totalValue,
        commissionAmount: calculation.totalCommission,
        tierReached: calculation.tierReached || 1,
        profileName: trainer.commissionProfile?.name || 'Default',
        breakdown: {
          sessionCommission: calculation.sessionCommission,
          salesCommission: calculation.salesCommission || 0,
          tierBonus: calculation.tierBonus || 0
        }
      })
    } catch (error) {
      console.error(`Failed to calculate commission for ${trainer.name}:`, error)
    }
  }
  
  // Sort by commission amount (highest first)
  const commissions = commissionCalculations.sort((a, b) => b.commissionAmount - a.commissionAmount)
  
  // Get locations for filter (admins and PT managers only)
  let locations: Array<{ id: string; name: string }> = []
  if (session.user.role === 'ADMIN' || session.user.role === 'PT_MANAGER') {
    locations = await prisma.location.findMany({
      where: { 
        organizationId,
        active: true
      },
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