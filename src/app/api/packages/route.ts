import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserAccessibleLocations, userHasLocationAccess } from '@/lib/user-locations'
import { calculateExpiryDate } from '@/lib/package-expiry'

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
    } else if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      // Club managers and PT managers can only see packages for clients at their accessible locations
      const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
      if (accessibleLocations && accessibleLocations.length > 0) {
        where.client = {
          locationId: { in: accessibleLocations },
        }
      } else {
        // No accessible locations
        where.id = 'no-access'
      }
    }
    // ADMIN sees all (no additional filter)

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
      expiresAt,
      isDemo = false,
      initialPayment // Optional: { amount: number, paymentDate?: string }
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

    // Club managers and PT managers can only create packages for clients at their accessible locations
    if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      const hasAccess = await userHasLocationAccess(
        session.user.id,
        session.user.role,
        client.locationId
      )
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Can only create packages for clients at your accessible locations' },
          { status: 403 }
        )
      }
    }

    // Calculate session value (0 if package is free)
    const sessionValue = totalSessions > 0 ? totalValue / totalSessions : 0

    // Determine start trigger and expiry from package type settings
    let effectiveStartDate: Date | null = null
    let calculatedExpiresAt: Date | null = expiresAt ? new Date(expiresAt) : null
    let resolvedPackageType = 'Custom'

    if (packageTypeId) {
      const pkgType = await prisma.packageType.findUnique({
        where: { id: packageTypeId },
        select: { name: true, startTrigger: true, expiryDurationValue: true, expiryDurationUnit: true },
      })

      if (pkgType) {
        resolvedPackageType = pkgType.name
        if (pkgType.startTrigger === 'DATE_OF_PURCHASE') {
          effectiveStartDate = startDate ? new Date(startDate) : new Date()
          // Auto-calculate expiry if duration is set and no manual expiresAt provided
          if (pkgType.expiryDurationValue && pkgType.expiryDurationUnit && !expiresAt) {
            calculatedExpiresAt = calculateExpiryDate(
              effectiveStartDate,
              pkgType.expiryDurationValue,
              pkgType.expiryDurationUnit
            )
          }
        }
        // FIRST_SESSION: effectiveStartDate stays null, expiresAt stays null (set on first session)
      }
    } else {
      // No package type — treat as date of purchase (legacy behavior)
      effectiveStartDate = startDate ? new Date(startDate) : new Date()
    }

    // Create package with organizationId for direct filtering
    const newPackage = await prisma.package.create({
      data: {
        clientId,
        packageType: resolvedPackageType,
        packageTypeId: packageTypeId || null,
        name,
        totalValue,
        totalSessions,
        remainingSessions: totalSessions, // Start with full sessions
        sessionValue,
        startDate: startDate ? new Date(startDate) : new Date(),
        expiresAt: calculatedExpiresAt,
        effectiveStartDate,
        organizationId: session.user.organizationId,
        isDemo,
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

    // Create initial payment record
    // If no initialPayment provided, assume full payment (backward compatible)
    const paymentAmount = initialPayment?.amount ?? totalValue
    const paymentDate = initialPayment?.paymentDate
      ? new Date(initialPayment.paymentDate)
      : newPackage.startDate || new Date()

    if (paymentAmount > 0) {
      await prisma.payment.create({
        data: {
          packageId: newPackage.id,
          amount: paymentAmount,
          paymentDate,
          notes: paymentAmount < totalValue ? 'Initial payment' : 'Full payment',
          createdById: session.user.id
        }
      })
    }

    return NextResponse.json(newPackage, { status: 201 })
  } catch (error) {
    console.error('Error creating package:', error)
    return NextResponse.json(
      { error: 'Failed to create package' },
      { status: 500 }
    )
  }
}