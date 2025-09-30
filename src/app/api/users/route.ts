import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getOrganizationId } from '@/lib/organization-context'
import { canAddTrainer } from '@/lib/usage-limits'

// GET /api/users - List all users with pagination and filters
export async function GET(request: NextRequest) {
  try {
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
    
    const skip = (page - 1) * limit

    // Get organization context
    const organizationId = await getOrganizationId()
    
    const where: any = {
      active: true,
      organizationId, // Filter by organization
      // Hide super admin from regular users table
      NOT: {
        role: 'SUPER_ADMIN'
      }
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

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can create users
    if (!['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role, locationId } = body

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Check usage limits if creating a trainer
    if (role === 'TRAINER') {
      const organizationId = await getOrganizationId()
      if (!organizationId) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 400 }
        )
      }

      const canAdd = await canAddTrainer(organizationId)
      if (!canAdd.allowed) {
        return NextResponse.json(
          { 
            error: canAdd.reason,
            needsUpgrade: true,
            usage: canAdd.usage 
          },
          { status: 403 }
        )
      }
    }

    // Club managers can only create trainers in their location
    if (session.user.role === 'CLUB_MANAGER') {
      if (role !== 'TRAINER') {
        return NextResponse.json(
          { error: 'Club managers can only create trainers' },
          { status: 403 }
        )
      }
      if (locationId !== session.user.locationId) {
        return NextResponse.json(
          { error: 'Can only create users in your location' },
          { status: 403 }
        )
      }
    }

    // Get organization context
    const organizationId = await getOrganizationId()
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        locationId,
        organizationId, // Set organization for new user
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        locationId: true,
        active: true,
        createdAt: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_CREATED',
        userId: session.user.id,
        entityType: 'User',
        entityId: user.id,
        newValue: {
          email: user.email,
          role: user.role,
        },
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}