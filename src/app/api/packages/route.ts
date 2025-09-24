import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/packages - List all packages with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const clientId = searchParams.get('clientId') || ''
    const active = searchParams.get('active') !== 'false'
    const hasRemaining = searchParams.get('hasRemaining') === 'true'
    
    const skip = (page - 1) * limit

    const where: any = {}

    if (searchParams.has('active')) {
      where.active = active
    } else {
      where.active = true
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (hasRemaining) {
      where.remainingSessions = { gt: 0 }
    }

    // Filter by organization
    where.organizationId = session.user.organizationId
    
    // Additional role-based restrictions
    if (session.user.role === 'TRAINER') {
      // Trainers can only see packages for their assigned clients
      where.client = {
        primaryTrainerId: session.user.id,
      }
    } else if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
      // Club managers can only see packages for clients at their location
      where.client = {
        locationId: session.user.locationId,
      }
    }

    const [packages, total] = await Promise.all([
      prisma.package.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          packageType: true,
          packageTypeId: true,
          packageTypeModel: {
            select: {
              id: true,
              name: true,
            },
          },
          name: true,
          totalValue: true,
          totalSessions: true,
          remainingSessions: true,
          sessionValue: true,
          startDate: true,
          expiresAt: true,
          active: true,
          clientId: true,
          organizationId: true,
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              sessions: true,
            },
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

// POST /api/packages - Create new package
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can create packages
    if (session.user.role === 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      clientId, 
      packageType, 
      packageTypeId,
      name, 
      totalValue, 
      totalSessions,
      startDate,
      expiresAt 
    } = body

    // Validate required fields
    if (!clientId || !name || totalValue === undefined || totalValue === null || !totalSessions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate values are not negative
    if (totalValue < 0 || totalSessions <= 0) {
      return NextResponse.json(
        { error: 'Total value cannot be negative and sessions must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate client exists and check permissions
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        locationId: true,
        name: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Club managers can only create packages for clients at their location
    if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
      if (client.locationId !== session.user.locationId) {
        return NextResponse.json(
          { error: 'Can only create packages for clients at your location' },
          { status: 403 }
        )
      }
    }

    // Calculate session value (0 if package is free)
    const sessionValue = totalSessions > 0 ? totalValue / totalSessions : 0

    // Create package with organizationId for direct filtering
    const newPackage = await prisma.package.create({
      data: {
        clientId,
        packageType: packageType || 'Custom',
        packageTypeId: packageTypeId || null,
        name,
        totalValue,
        totalSessions,
        remainingSessions: totalSessions, // Start with full sessions
        sessionValue,
        startDate: startDate ? new Date(startDate) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        organizationId: session.user.organizationId, // Set organizationId directly
      },
      select: {
        id: true,
        packageType: true,
        packageTypeId: true,
        name: true,
        totalValue: true,
        totalSessions: true,
        remainingSessions: true,
        sessionValue: true,
        startDate: true,
        expiresAt: true,
        active: true,
        clientId: true,
        createdAt: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PACKAGE_CREATED',
        userId: session.user.id,
        entityType: 'Package',
        entityId: newPackage.id,
        newValue: {
          clientId: newPackage.clientId,
          clientName: client.name,
          packageName: newPackage.name,
          totalValue: newPackage.totalValue,
          totalSessions: newPackage.totalSessions,
        },
      },
    })

    return NextResponse.json(newPackage, { status: 201 })
  } catch (error) {
    console.error('Error creating package:', error)
    return NextResponse.json(
      { error: 'Failed to create package' },
      { status: 500 }
    )
  }
}