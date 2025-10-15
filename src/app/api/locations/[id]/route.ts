import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        userLocations: {
          where: {
            user: {
              role: 'TRAINER',
              active: true
            }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                _count: {
                  select: {
                    sessions: {
                      where: {
                        sessionDate: {
                          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        clients: {
          where: {
            active: true
          },
          select: {
            id: true,
            name: true,
            email: true,
            primaryTrainer: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        },
        _count: {
          select: {
            sessions: {
              where: {
                sessionDate: {
                  gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                }
              }
            }
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (session.user.role === 'TRAINER' || session.user.role === 'CLUB_MANAGER') {
      // Check if user has access to this location through UserLocation
      const userLocation = await prisma.userLocation.findFirst({
        where: {
          userId: session.user.id,
          locationId: id
        }
      })
      if (!userLocation) {
        return NextResponse.json(
          { error: 'You can only view your assigned location' },
          { status: 403 }
        )
      }
    }

    // Transform the response to flatten the user data from junction table
    const transformedLocation = {
      ...location,
      users: location.userLocations.map(ul => ul.user).sort((a, b) => a.name.localeCompare(b.name)),
      userLocations: undefined, // Remove the junction table from response
      sessionsThisMonth: location._count.sessions
    }
    
    return NextResponse.json(transformedLocation)
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and PT managers can update locations
  if (session.user.role !== 'ADMIN' && session.user.role !== 'PT_MANAGER') {
    return NextResponse.json(
      { error: 'Only administrators can update locations' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { name, active } = body

    // Check if location exists
    const existing = await prisma.location.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if new name conflicts with another location
    if (name && name !== existing.name) {
      const nameConflict = await prisma.location.findUnique({
        where: { name: name.trim() }
      })
      
      if (nameConflict) {
        return NextResponse.json(
          { error: 'A location with this name already exists' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (active !== undefined) updateData.active = active

    const location = await prisma.location.update({
      where: { id },
      data: updateData
    })

    // TODO: Add audit log

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins can archive locations
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only administrators can archive locations' },
      { status: 403 }
    )
  }

  try {
    // Check if location exists
    const location = await prisma.location.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true,
        organizationId: true,
        active: true
      }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    if (!location.active) {
      return NextResponse.json(
        { error: 'Location is already archived' },
        { status: 400 }
      )
    }

    console.log('🗑️ DELETE: Checking dependencies for location:', id, location.name)
    
    // Check dependencies directly (same logic as archive-impact endpoint)
    const [
      activeUsers,
      activeClients,
      upcomingSessions,
      totalActiveLocations
    ] = await Promise.all([
      prisma.userLocation.count({
        where: {
          locationId: id,
          user: { active: true }
        }
      }),
      prisma.client.count({
        where: {
          locationId: id,
          active: true
        }
      }),
      prisma.session.count({
        where: {
          locationId: id,
          sessionDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.location.count({
        where: {
          organizationId: location.organizationId,
          active: true
        }
      })
    ])

    console.log('📊 DELETE: Dependencies found:', {
      activeUsers,
      activeClients,
      upcomingSessions,
      totalActiveLocations
    })

    // Check for blockers
    const blockers = []
    
    if (totalActiveLocations <= 1) {
      blockers.push({
        type: 'last_location',
        message: 'Cannot archive the only remaining active location'
      })
    }
    
    if (activeUsers > 0) {
      blockers.push({
        type: 'users',
        message: `${activeUsers} user${activeUsers !== 1 ? 's have' : ' has'} access to this location`
      })
    }
    
    if (activeClients > 0) {
      blockers.push({
        type: 'clients',
        message: `${activeClients} active client${activeClients !== 1 ? 's are' : ' is'} assigned to this location`
      })
    }
    
    if (upcomingSessions > 0) {
      blockers.push({
        type: 'sessions',
        message: `${upcomingSessions} upcoming session${upcomingSessions !== 1 ? 's are' : ' is'} scheduled`
      })
    }

    // If there are blockers, prevent archiving
    if (blockers.length > 0) {
      console.log('❌ DELETE: Blocking archive due to:', blockers)
      return NextResponse.json(
        {
          error: 'Cannot archive location with active dependencies',
          blockers,
          summary: {
            activeUsers,
            activeClients,
            upcomingSessions,
            totalActiveLocations
          }
        },
        { status: 400 }
      )
    }

    console.log('✅ DELETE: No blockers found, proceeding with archive')
    
    // Proceed with soft delete (archive)
    const archivedLocation = await prisma.location.update({
      where: { id },
      data: {
        active: false,
        archivedAt: new Date(),
        archivedBy: session.user.id
      }
    })
    
    console.log('✅ DELETE: Location archived successfully:', archivedLocation.id)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'LOCATION_ARCHIVED',
        entityType: 'location',
        entityId: id,
        oldValue: {
          active: true,
          name: archivedLocation.name
        },
        newValue: {
          active: false,
          name: archivedLocation.name,
          archivedAt: archivedLocation.archivedAt,
          archivedBy: session.user.id
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Location archived successfully',
      location: archivedLocation
    })

  } catch (error) {
    console.error('❌ DELETE: Error archiving location:', error)
    console.error('Error details:', {
      locationId: id,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Failed to archive location' },
      { status: 500 }
    )
  }
}