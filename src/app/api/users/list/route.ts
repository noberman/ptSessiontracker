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
  
  // Only managers and admins can view user list
  if (!['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || ''
  const locationId = searchParams.get('locationId') || ''
  const activeParam = searchParams.get('active')
  
  const skip = (page - 1) * limit
  
  const where: any = {
    // If active param is explicitly false, show inactive users; otherwise show active
    active: activeParam === 'false' ? false : true,
    // Always filter by organization
    organizationId: session.user.organizationId,
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  
  if (role) {
    where.role = role
  }
  
  if (locationId) {
    where.locations = {
      some: {
        locationId: locationId
      }
    }
  }
  
  // Restrict club managers and PT managers to their accessible locations
  if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
    const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
    if (accessibleLocations && accessibleLocations.length > 0) {
      // Show users with access to those locations through UserLocation junction table
      where.locations = {
        some: {
          locationId: { in: accessibleLocations }
        }
      }
    } else {
      // No accessible locations
      where.id = 'no-access'
    }
  }
  
  // Debug logging
  console.log('Users API - Request params:', {
    page,
    limit,
    search,
    role,
    locationId,
    activeParam,
    userRole: session.user.role,
    userId: session.user.id
  })
  console.log('Users API - Where clause:', JSON.stringify(where, null, 2))
  
  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          locations: {
            select: {
              location: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.user.count({ where }),
    ])
    
    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching users - Full error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      where: JSON.stringify(where, null, 2)
    })
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}