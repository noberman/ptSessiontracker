import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserAccessibleLocations } from '@/lib/user-locations'

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
  const clientId = searchParams.get('clientId') || ''
  const locationId = searchParams.get('locationId') || ''
  const validated = searchParams.get('validated')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  
  const skip = (page - 1) * limit
  
  const where: any = {
    cancelled: false,
  }
  
  if (search) {
    where.OR = [
      { trainer: { name: { contains: search, mode: 'insensitive' } } },
      { client: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }
  
  if (trainerId) {
    where.trainerId = trainerId
  }
  
  if (clientId) {
    where.clientId = clientId
  }
  
  if (locationId) {
    where.locationId = locationId
  }
  
  if (validated !== null && validated !== undefined) {
    where.validated = validated === 'true'
  }
  
  if (startDate) {
    where.sessionDate = {
      ...where.sessionDate,
      gte: new Date(startDate),
    }
  }
  
  if (endDate) {
    where.sessionDate = {
      ...where.sessionDate,
      lte: new Date(endDate),
    }
  }
  
  // Role-based filtering
  if (session.user.role === 'TRAINER') {
    where.trainerId = session.user.id
  } else if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
    const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
    if (accessibleLocations && accessibleLocations.length > 0) {
      where.locationId = { in: accessibleLocations }
    } else {
      // No accessible locations
      where.id = 'no-access'
    }
  }
  // ADMIN sees all (no additional filter)
  
  try {
    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          sessionDate: true,
          sessionValue: true,
          validated: true,
          validatedAt: true,
          cancelled: true,
          cancelledAt: true,
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
          package: {
            select: {
              id: true,
              name: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          sessionDate: 'desc',
        },
      }),
      prisma.session.count({ where }),
    ])
    
    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}