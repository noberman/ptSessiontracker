import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const search = searchParams.get('search') || ''
  const clientId = searchParams.get('clientId') || ''
  const status = searchParams.get('status') || ''
  
  const skip = (page - 1) * limit
  
  const where: any = {}
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { client: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }
  
  if (clientId) {
    where.clientId = clientId
  }
  
  if (status) {
    if (status === 'active') {
      where.status = 'ACTIVE'
    } else if (status === 'expired') {
      where.OR = [
        { status: 'EXPIRED' },
        {
          AND: [
            { status: 'ACTIVE' },
            { expiryDate: { lt: new Date() } }
          ]
        }
      ]
    } else if (status === 'completed') {
      where.sessionsRemaining = 0
    }
  }
  
  // Role-based filtering
  if (session.user.role === 'TRAINER') {
    // Trainers see packages for their clients
    where.client = {
      primaryTrainerId: session.user.id
    }
  } else if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    // Club managers see packages for clients at their location
    where.client = {
      locationId: session.user.locationId
    }
  }
  
  try {
    const [packages, total] = await Promise.all([
      prisma.package.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          packageType: true,
          totalSessions: true,
          remainingSessions: true,
          totalValue: true,
          sessionValue: true,
          active: true,
          startDate: true,
          expiresAt: true,
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              primaryTrainer: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          },
          _count: {
            select: {
              sessions: true
            }
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.package.count({ where }),
    ])
    
    return NextResponse.json({
      packages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    )
  }
}