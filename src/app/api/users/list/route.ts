import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    where.locationId = locationId
  }
  
  // Restrict club managers to their location
  if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    where.locationId = session.user.locationId
  }
  
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
          locationId: true,
          location: {
            select: {
              name: true,
            },
          },
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
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}