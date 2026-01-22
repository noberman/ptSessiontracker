import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CommissionDashboard } from '@/components/commission/CommissionDashboardSimple'
import { CommissionCalculatorV2 } from '@/lib/commission/v2/CommissionCalculatorV2'
import { prisma } from '@/lib/prisma'
import { getMonthBoundariesInUtc } from '@/utils/timezone'

export default async function CommissionPage({
  searchParams
}: {
  searchParams: Promise<{
    month?: string
    locationIds?: string  // Comma-separated location IDs
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
  
  // Fetch organization timezone
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timezone: true }
  })
  const orgTimezone = organization?.timezone || 'Asia/Singapore'
  
  // Get current month or from params
  const currentDate = new Date()
  const monthParam = params.month || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  const [year, month] = monthParam.split('-').map(Number)
  const selectedMonth = new Date(year, month - 1)
  
  // Get date range for the selected month in UTC (for database queries)
  const { start: startOfMonth, end: endOfMonth } = getMonthBoundariesInUtc(year, month, orgTimezone)
  
  // Parse location filter - supports multiple locations as comma-separated string
  let locationIds: string[] = params.locationIds ? params.locationIds.split(',').filter(Boolean) : []

  if (session.user.role === 'CLUB_MANAGER') {
    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { locations: true }
    })

    // Use first accessible location if no locationIds provided
    if (manager?.locations && manager.locations.length > 0) {
      const accessibleIds = manager.locations.map(l => l.locationId)
      if (locationIds.length === 0) {
        locationIds = [accessibleIds[0]]
      } else {
        // Filter to only locations they have access to
        locationIds = locationIds.filter(id => accessibleIds.includes(id))
        if (locationIds.length === 0) {
          locationIds = [accessibleIds[0]]
        }
      }
    }
  }
  
  // Get all trainers and PT managers with commission profiles
  // When filtering by location, show trainers who have SESSIONS at those locations (not just access)
  const trainers = await prisma.user.findMany({
    where: {
      organizationId,
      role: {
        in: ['TRAINER', 'PT_MANAGER']
      },
      active: true,
      commissionProfileId: { not: null },
      ...(locationIds.length > 0 ? {
        // Filter to trainers who have sessions at any of these locations during the period
        sessions: {
          some: {
            locationId: { in: locationIds },
            sessionDate: {
              gte: startOfMonth,
              lte: endOfMonth
            },
            validated: true,
            cancelled: false
          }
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

  // Debug: Log trainers found
  console.log(`[COMMISSION] Found ${trainers.length} trainers for org ${organizationId}`)
  trainers.forEach(t => {
    console.log(`[COMMISSION] - ${t.name}: profile=${t.commissionProfile?.name}, tiers=${t.commissionProfile?.tiers?.length || 0}`)
  })

  // Calculate commissions using v2 calculator
  const calculator = new CommissionCalculatorV2()
  const commissionCalculations = []
  
  for (const trainer of trainers) {
    try {
      const calculation = await calculator.calculateCommission(
        trainer.id,
        { start: startOfMonth, end: endOfMonth },
        { saveCalculation: false, locationIds: locationIds.length > 0 ? locationIds : undefined } // Don't save, just calculate for display
      )

      // Get trainer's sessions for the period to show details (filtered by locations if specified)
      const sessions = await prisma.session.findMany({
        where: {
          trainerId: trainer.id,
          sessionDate: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          validated: true,
          cancelled: false,
          ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {})
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
      // Log detailed error for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Failed to calculate commission for ${trainer.name} (${trainer.id}):`, errorMessage)
      console.error('Profile info:', JSON.stringify({
        profileId: trainer.commissionProfile?.id,
        profileName: trainer.commissionProfile?.name,
        tiersCount: trainer.commissionProfile?.tiers?.length || 0
      }))

      // Still include the trainer with error indication so they're visible
      // Get their sessions count at least (filtered by locations if specified)
      const sessions = await prisma.session.findMany({
        where: {
          trainerId: trainer.id,
          sessionDate: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          validated: true,
          cancelled: false,
          ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {})
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
        totalSessions: sessions.length,
        totalValue,
        commissionAmount: 0, // Can't calculate
        tierReached: 0, // Indicates error
        profileName: `${trainer.commissionProfile?.name || 'Unknown'} (Error: ${errorMessage})`,
        breakdown: {
          sessionCommission: 0,
          salesCommission: 0,
          tierBonus: 0
        }
      })
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
        selectedLocationIds={locationIds}
        currentUserRole={session.user.role}
        orgTimezone={orgTimezone}
      />
    </div>
  )
}