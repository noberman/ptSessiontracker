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
  const locationIds = searchParams.get('locationIds')

  try {
    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    // Get location filter - either from query param or from user access
    let locationFilter: any = {}

    // If locationIds provided in query, use those (respecting user access for managers)
    if (locationIds) {
      const requestedLocationIds = locationIds.split(',').filter(Boolean)
      if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
        // Filter to only locations the manager has access to
        const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
        const allowedLocationIds = requestedLocationIds.filter(id => accessibleLocations?.includes(id))
        if (allowedLocationIds.length > 0) {
          locationFilter = { locationId: { in: allowedLocationIds } }
        } else {
          return NextResponse.json([])
        }
      } else {
        // Admin can use any location
        locationFilter = { locationId: { in: requestedLocationIds } }
      }
    } else if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      // No locationIds provided - use all accessible locations for managers
      const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
      if (accessibleLocations && accessibleLocations.length > 0) {
        locationFilter = { locationId: { in: accessibleLocations } }
      } else {
        // No accessible locations - return empty result
        return NextResponse.json([])
      }
    }

    // Return all non-cancelled sessions from active packages
    // Include both validated and pending so we can show validation rate
    const sessions = await prisma.session.findMany({
      where: {
        trainerId: params.id,
        cancelled: false,
        package: { active: true },
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
        },
        location: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        sessionDate: 'desc'
      }
    })

    // Group sessions by value, tracking validated vs total counts
    const sessionsByValue = sessions.reduce((acc, session) => {
      const value = session.sessionValue || 0

      if (!acc[value]) {
        acc[value] = {
          sessionValue: value,
          count: 0,           // Total sessions (validated + pending)
          validatedCount: 0,  // Only validated sessions
          totalValue: 0,      // Value from validated sessions only (for commission)
          sessions: []
        }
      }

      acc[value].count++
      if (session.validated) {
        acc[value].validatedCount++
        acc[value].totalValue += value  // Only add to totalValue if validated
      }
      acc[value].sessions.push({
        id: session.id,
        clientName: session.client.name,
        sessionDate: session.sessionDate.toISOString(), // Keep full ISO string for proper timezone handling
        createdAt: session.createdAt.toISOString(),
        validated: session.validated,
        packageName: session.package?.name,
        locationName: session.location?.name
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