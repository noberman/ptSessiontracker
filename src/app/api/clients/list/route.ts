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
  const locationId = searchParams.get('locationId') || ''
  
  const skip = (page - 1) * limit
  
  const where: any = {
    active: true,
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
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          active: true,
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
      }),
      prisma.client.count({ where }),
    ])
    
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