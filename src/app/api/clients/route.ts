import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserAccessibleLocations } from '@/lib/user-locations'

// GET /api/clients - List all clients with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const locationId = searchParams.get('locationId') || ''
    const primaryTrainerId = searchParams.get('primaryTrainerId') || ''
    const active = searchParams.get('active') !== 'false' // Default to active only
    
    const skip = (page - 1) * limit

    const where: any = {}

    // Default to active clients unless explicitly requested
    if (searchParams.has('active')) {
      where.active = active
    } else {
      where.active = true
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (locationId) {
      where.locationId = locationId
    }

    if (primaryTrainerId) {
      where.primaryTrainerId = primaryTrainerId
    }

    // Filter by organization directly
    where.organizationId = session.user.organizationId
    
    // Additional role-based restrictions
    if (session.user.role === 'TRAINER') {
      // Get trainer's accessible locations (both old locationId and new UserLocation records)
      const trainer = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          locationId: true,
          locations: {
            select: { locationId: true }
          }
        }
      })
      
      // Collect all accessible location IDs
      const accessibleLocationIds: string[] = []
      if (trainer?.locationId) {
        accessibleLocationIds.push(trainer.locationId)
      }
      if (trainer?.locations) {
        accessibleLocationIds.push(...trainer.locations.map(l => l.locationId))
      }
      
      // Filter clients by accessible locations
      if (accessibleLocationIds.length > 0) {
        where.locationId = { in: accessibleLocationIds }
      } else {
        // If no locations, show only directly assigned clients as fallback
        where.primaryTrainerId = session.user.id
      }
    } else if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      // Club managers and PT managers can only see clients at their accessible locations
      const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
      if (accessibleLocations && accessibleLocations.length > 0) {
        where.locationId = { in: accessibleLocations }
      } else {
        // No accessible locations - show nothing
        where.id = 'no-access'
      }
    }
    // ADMIN sees all (no additional filter)

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
          primaryTrainerId: true,
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
              sessions: true,
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

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can create clients
    if (session.user.role === 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, phone, locationId, primaryTrainerId, isDemo = false } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if email already exists within the organization
    const existingClient = await prisma.client.findFirst({
      where: { 
        email,
        organizationId: session.user.organizationId
      },
    })

    if (existingClient) {
      return NextResponse.json(
        { error: 'Client with this email already exists in your organization' },
        { status: 400 }
      )
    }

    // For club managers and PT managers, ensure they can only create clients at their accessible locations
    if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
      if (!accessibleLocations || !accessibleLocations.includes(locationId)) {
        return NextResponse.json(
          { error: 'Can only create clients at your accessible locations' },
          { status: 403 }
        )
      }
    }

    // Validate trainer assignment (PT Managers can also be trainers)
    if (primaryTrainerId) {
      const targetLocationId = locationId || session.user.locationId
      const trainer = await prisma.user.findFirst({
        where: {
          id: primaryTrainerId,
          role: { in: ['TRAINER', 'PT_MANAGER'] },
          active: true,
          organizationId: session.user.organizationId, // Ensure trainer is in same org
          OR: [
            // Check old system (locationId field)
            { locationId: targetLocationId },
            // Check new system (UserLocation records)
            {
              locations: {
                some: {
                  locationId: targetLocationId
                }
              }
            }
          ]
        },
      })

      if (!trainer) {
        return NextResponse.json(
          { error: 'Invalid trainer selection - trainer must have access to the client\'s location' },
          { status: 400 }
        )
      }
    }

    // Create client with organizationId for fast filtering
    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone: phone || null,
        locationId: locationId || session.user.locationId || null, // Default to user's location
        primaryTrainerId: primaryTrainerId || null,
        organizationId: session.user.organizationId, // Set organizationId directly
        isDemo, // Add isDemo flag
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        locationId: true,
        primaryTrainerId: true,
        active: true,
        createdAt: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CLIENT_CREATED',
        userId: session.user.id,
        entityType: 'Client',
        entityId: client.id,
        newValue: {
          name: client.name,
          email: client.email,
          primaryTrainerId: client.primaryTrainerId,
        },
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}