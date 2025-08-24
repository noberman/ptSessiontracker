import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const clientIds = searchParams.get('clientIds')
  const trainerIds = searchParams.get('trainerIds')
  const locationIds = searchParams.get('locationIds')
  const validatedStatuses = searchParams.get('validatedStatuses')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  
  const skip = (page - 1) * limit

  const where: any = {}

  // Filter by clients (multi-select)
  if (clientIds) {
    const ids = clientIds.split(',').filter(Boolean)
    if (ids.length > 0) {
      where.clientId = { in: ids }
    }
  }

  // Filter by trainers (multi-select)
  if (trainerIds) {
    const ids = trainerIds.split(',').filter(Boolean)
    if (ids.length > 0) {
      where.trainerId = { in: ids }
    }
  } else if (session.user.role === 'TRAINER') {
    // Trainers can only see their own sessions
    where.trainerId = session.user.id
  }

  // Filter by locations (multi-select)
  if (locationIds) {
    const ids = locationIds.split(',').filter(Boolean)
    if (ids.length > 0) {
      where.locationId = { in: ids }
    }
  } else if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    // Club managers can only see sessions at their location
    where.locationId = session.user.locationId
  }

  // Filter by validation status (multi-select)
  if (validatedStatuses) {
    const statuses = validatedStatuses.split(',').filter(Boolean)
    if (statuses.length === 1) {
      where.validated = statuses[0] === 'true'
    } else if (statuses.length > 1) {
      // If both are selected, show all (no filter needed)
      where.OR = statuses.map(status => ({ validated: status === 'true' }))
    }
  }

  // Date range filter
  if (startDate || endDate) {
    where.sessionDate = {}
    if (startDate) {
      where.sessionDate.gte = new Date(startDate)
    }
    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      where.sessionDate.lte = endDateTime
    }
  }

  try {
    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          location: {
            select: {
              id: true,
              name: true,
            }
          },
          package: {
            select: {
              id: true,
              name: true,
              packageType: true,
            }
          }
        },
        orderBy: {
          sessionDate: 'desc'
        }
      }),
      prisma.session.count({ where })
    ])

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      clientId,
      trainerId,
      packageId,
      sessionDate,
      notes
    } = body

    // Validate required fields
    if (!clientId || !packageId || !sessionDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Determine the trainer ID
    let actualTrainerId = session.user.id
    
    // Only managers and admins can specify a different trainer
    if (trainerId && trainerId !== session.user.id) {
      if (!['PT_MANAGER', 'ADMIN', 'CLUB_MANAGER'].includes(session.user.role)) {
        return NextResponse.json(
          { error: 'You do not have permission to create sessions for other trainers' },
          { status: 403 }
        )
      }
      
      // Verify the trainer exists and is active
      const trainer = await prisma.user.findUnique({
        where: { id: trainerId, role: 'TRAINER', active: true }
      })
      
      if (!trainer) {
        return NextResponse.json(
          { error: 'Invalid trainer selected' },
          { status: 400 }
        )
      }
      
      actualTrainerId = trainerId
    }

    // Get the client and package details
    const [client, pkg] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        include: {
          primaryTrainer: true,
          location: true,
        }
      }),
      prisma.package.findUnique({
        where: { id: packageId }
      })
    ])

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (!pkg) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    // Check if package belongs to the client
    if (pkg.clientId !== clientId) {
      return NextResponse.json(
        { error: 'Package does not belong to this client' },
        { status: 400 }
      )
    }

    // Check if package is active
    if (!pkg.active) {
      return NextResponse.json(
        { error: 'Package is inactive' },
        { status: 400 }
      )
    }

    // Check if package has expired
    if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Package has expired' },
        { status: 400 }
      )
    }

    // For trainers, verify they have permission to create sessions for this client
    if (session.user.role === 'TRAINER') {
      // Check if trainer is at the same location as the client
      const trainer = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { locationId: true }
      })

      if (trainer?.locationId !== client.locationId) {
        return NextResponse.json(
          { error: 'You can only create sessions for clients at your location' },
          { status: 403 }
        )
      }
    }

    // Generate validation token
    const validationToken = crypto.randomBytes(32).toString('hex')
    const validationExpiry = new Date()
    validationExpiry.setDate(validationExpiry.getDate() + 30) // 30 days from now

    // Create the session in a transaction
    const newSession = await prisma.$transaction(async (tx) => {
      // Create the session
      const createdSession = await tx.session.create({
        data: {
          clientId,
          trainerId: actualTrainerId,
          packageId,
          locationId: client.locationId,
          sessionDate: new Date(sessionDate),
          sessionValue: pkg.sessionValue,
          notes: notes || null,
          validated: false,
          validationToken,
          validationExpiry,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          location: {
            select: {
              id: true,
              name: true,
            }
          },
          package: {
            select: {
              id: true,
              name: true,
              packageType: true,
            }
          }
        }
      })

      // Update package remaining sessions
      if (pkg.remainingSessions > 0) {
        await tx.package.update({
          where: { id: packageId },
          data: {
            remainingSessions: pkg.remainingSessions - 1
          }
        })
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          entityType: 'SESSION',
          entityId: createdSession.id,
          newValue: {
            clientId,
            packageId,
            sessionValue: pkg.sessionValue
          }
        }
      })

      return createdSession
    })

    return NextResponse.json(newSession, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}