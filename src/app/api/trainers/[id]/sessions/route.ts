import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserAccessibleLocations } from '@/lib/user-locations'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only managers and admins can view trainer details
  if (session.user.role === 'TRAINER' && session.user.id !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    // Get all sessions for the trainer
    // Get location filter for Club Managers and PT Managers
    let locationFilter: any = {}
    if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
      if (accessibleLocations && accessibleLocations.length > 0) {
        locationFilter = { locationId: { in: accessibleLocations } }
      } else {
        // No accessible locations - return empty result
        return NextResponse.json([])
      }
    }
    
    const sessions = await prisma.session.findMany({
      where: {
        trainerId: params.id,
        ...(startDate || endDate ? { sessionDate: dateFilter } : {}),
        ...locationFilter
      },
      include: {
        client: {
          select: {
            name: true,
            email: true
          }
        },
        package: {
          select: {
            name: true,
            packageType: true
          }
        }
      },
      orderBy: {
        sessionDate: 'desc'
      }
    })

    // Group sessions by value
    const sessionsByValue = sessions.reduce((acc, session) => {
      const value = session.sessionValue || 0
      
      if (!acc[value]) {
        acc[value] = {
          sessionValue: value,
          count: 0,
          totalValue: 0,
          sessions: []
        }
      }
      
      acc[value].count++
      acc[value].totalValue += value
      acc[value].sessions.push({
        id: session.id,
        clientName: session.client.name,
        sessionDate: session.sessionDate.toISOString(),
        validated: session.validated,
        packageName: session.package?.name
      })
      
      return acc
    }, {} as Record<number, any>)

    // Convert to array and sort by value descending
    const sessionGroups = Object.values(sessionsByValue)
      .sort((a: any, b: any) => b.sessionValue - a.sessionValue)

    return NextResponse.json(sessionGroups)
  } catch (error) {
    console.error('Error fetching trainer sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trainer sessions' },
      { status: 500 }
    )
  }
}