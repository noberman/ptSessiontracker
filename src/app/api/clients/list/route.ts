import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserAccessibleLocations } from '@/lib/user-locations'
import { getClientState, type ClientState } from '@/lib/package-status'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const search = searchParams.get('search') || ''
  const trainerId = searchParams.get('trainerId') || ''
  const locationId = searchParams.get('locationId') || ''
  const clientStatesParam = searchParams.get('clientStates') || ''

  const skip = (page - 1) * limit
  const showArchived = searchParams.get('showArchived') === 'true'

  const where: any = {}

  // Handle status filtering
  if (showArchived) {
    where.status = { in: ['ACTIVE', 'ARCHIVED'] }
  } else {
    where.status = 'ACTIVE'
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (trainerId) {
    where.primaryTrainerId = trainerId
  }

  if (locationId) {
    where.locationId = locationId
  }

  // Client state filtering is done in-memory after fetching (see below)
  const clientStates = clientStatesParam
    ? (clientStatesParam.split(',').filter(Boolean) as ClientState[])
    : []
  const hasStateFilter = clientStates.length > 0

  // Trainers only see their own clients
  if (session.user.role === 'TRAINER') {
    where.primaryTrainerId = session.user.id
  }

  // Club managers and PT managers only see clients at their accessible locations
  if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
    const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
    if (accessibleLocations && accessibleLocations.length > 0) {
      where.locationId = { in: accessibleLocations }
    } else {
      // No accessible locations
      where.id = 'no-access'
    }
  }
  // Trainers see their own clients (already filtered above)
  // ADMIN sees all (no additional filter)
  
  try {
    // When state filter is active, fetch all matching clients (no pagination at DB level)
    // so we can accurately filter by computed state in-memory, then paginate the result.
    const clientsRaw = await prisma.client.findMany({
      where,
      ...(hasStateFilter ? {} : { skip, take: limit }),
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        locationId: true,
        location: {
          select: {
            name: true,
          },
        },
        primaryTrainer: {
          select: {
            name: true,
            email: true,
          },
        },
        // Include packages for state derivation
        packages: {
          select: {
            id: true,
            remainingSessions: true,
            totalSessions: true,
            expiresAt: true,
          },
        },
        // Most recent session for lastSessionDate
        sessions: {
          select: { sessionDate: true },
          orderBy: { sessionDate: 'desc' as const },
          take: 1,
        },
        _count: {
          select: {
            packages: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Calculate client state for each client
    const allClients = clientsRaw.map(client => {
      const clientState = getClientState({
        packages: client.packages,
        lastSessionDate: client.sessions[0]?.sessionDate ?? null,
      })
      // Remove packages and sessions arrays from response to keep it lean
      const { packages, sessions, ...clientWithoutPackages } = client
      return {
        ...clientWithoutPackages,
        clientState,
      }
    })

    // Post-filter by computed state when state filter is active
    const filteredClients = hasStateFilter
      ? allClients.filter(c => c.clientState && clientStates.includes(c.clientState))
      : allClients

    const total = hasStateFilter ? filteredClients.length : await prisma.client.count({ where })
    const clients = hasStateFilter
      ? filteredClients.slice(skip, skip + limit)
      : filteredClients

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}