import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  calculateMonthlyCommissions, 
  calculateTrainerCommission,
  getCommissionMethod,
  CommissionMethod
} from '@/lib/commission/calculator'
import { parse, startOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') // Format: YYYY-MM
    const locationId = searchParams.get('locationId')
    const trainerId = searchParams.get('trainerId')
    const methodParam = searchParams.get('method') as CommissionMethod | null
    
    // Parse month or use current month
    const month = monthParam 
      ? parse(monthParam, 'yyyy-MM', new Date())
      : new Date()
    
    // Get commission method (from param or default)
    const method = methodParam || await getCommissionMethod()
    
    // Check permissions
    const userRole = session.user.role
    const userId = session.user.id
    
    // Trainers can only see their own commission
    if (userRole === 'TRAINER') {
      if (trainerId && trainerId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      const commission = await calculateTrainerCommission(userId, month, method)
      return NextResponse.json({ 
        commission,
        month: monthParam || month.toISOString().slice(0, 7),
        method
      })
    }
    
    // Club managers can only see their location
    if (userRole === 'CLUB_MANAGER') {
      // Get club manager's accessible locations from UserLocation table
      const manager = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { locations: true }
      })
      
      if (!manager?.locations || manager.locations.length === 0) {
        return NextResponse.json({ error: 'No location assigned' }, { status: 400 })
      }
      
      const accessibleLocationIds = manager.locations.map(l => l.locationId)
      
      if (locationId && !accessibleLocationIds.includes(locationId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      // Use the locationId from query or the first accessible location
      const targetLocationId = locationId || accessibleLocationIds[0]
      
      const commissions = await calculateMonthlyCommissions(
        month, 
        targetLocationId,
        method,
        session.user.organizationId ?? undefined
      )
      
      return NextResponse.json({
        commissions,
        month: monthParam || month.toISOString().slice(0, 7),
        method,
        location: userLocationId
      })
    }
    
    // PT Managers and Admins can see everything
    if (userRole === 'PT_MANAGER' || userRole === 'ADMIN') {
      // If specific trainer requested
      if (trainerId) {
        const commission = await calculateTrainerCommission(trainerId, month, method)
        return NextResponse.json({ 
          commission,
          month: monthParam || month.toISOString().slice(0, 7),
          method
        })
      }
      
      // Otherwise get all trainers in the organization
      const commissions = await calculateMonthlyCommissions(
        month,
        locationId || undefined,
        method,
        session.user.organizationId ?? undefined
      )
      
      // Calculate totals
      const totals = {
        totalSessions: commissions.reduce((sum, c) => sum + c.totalSessions, 0),
        totalValue: commissions.reduce((sum, c) => sum + c.totalValue, 0),
        totalCommission: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
        trainerCount: commissions.length
      }
      
      return NextResponse.json({
        commissions,
        totals,
        month: monthParam || month.toISOString().slice(0, 7),
        method,
        location: locationId || 'all'
      })
    }
    
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    
  } catch (error: any) {
    console.error('Commission calculation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate commissions' },
      { status: 500 }
    )
  }
}